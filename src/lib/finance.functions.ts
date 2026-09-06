import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const BINANCE_HOSTS = [
  "https://api.binance.com",
  "https://api1.binance.com",
  "https://api2.binance.com",
  "https://api3.binance.com",
  "https://api4.binance.com",
];
const BINANCE_API = BINANCE_HOSTS[0];

type Signed = { urls: string[]; headers: Record<string, string> };

async function signedRequest(path: string, params: Record<string, string | number>): Promise<Signed> {
  const apiKey = (process.env["BINANCE_API_KEY"] ?? "").trim();
  const secret = (process.env["BINANCE_SECRET_KEY"] ?? "").trim();
  if (!apiKey || !secret) throw new Error("BINANCE_KEYS_MISSING");

  const query = new URLSearchParams({
    ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
    timestamp: String(Date.now()),
    recvWindow: "60000",
  });

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(query.toString()));
  const hex = [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");

  return {
    urls: BINANCE_HOSTS.map((h) => `${h}${path}?${query.toString()}&signature=${hex}`),
    headers: { "X-MBX-APIKEY": apiKey },
  };
}

/** Try every Binance API host until one answers; returns the response or throws the last error body. */
async function binanceFetch(signed: Signed): Promise<Response> {
  let lastError = "";
  for (const url of signed.urls) {
    try {
      const res = await fetch(url, { headers: signed.headers });
      if (res.ok) return res;
      const text = (await res.text()).slice(0, 200);
      lastError = `HTTP ${res.status}: ${text}`;
      // Signature/permission errors won't change by host — stop early.
      if (res.status === 401 || res.status === 403) break;
    } catch (e) {
      lastError = e instanceof Error ? e.message : "network error";
    }
  }
  throw new Error(`BINANCE_ERROR ${lastError}`);
}

async function assertAdmin(context: { supabase: { rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown }> }; userId: string }) {
  const { data } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (data !== true) throw new Error("FORBIDDEN");
}

type Balance = { asset: string; free: number; locked: number; usdValue: number };

/** Live Binance balances + transfer history. Admin only. */
export const getBinanceOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as never);

    try {
      const account = await signedRequest("/api/v3/account", {});
      const res = await binanceFetch(account);
      const acc = (await res.json()) as { balances: { asset: string; free: string; locked: string }[] };

      const priceRes = await fetch(`${BINANCE_API}/api/v3/ticker/price`);
      const prices = priceRes.ok ? ((await priceRes.json()) as { symbol: string; price: string }[]) : [];
      const priceMap = new Map(prices.map((p) => [p.symbol, Number(p.price)]));

      const balances: Balance[] = acc.balances
        .map((b) => {
          const free = Number(b.free);
          const locked = Number(b.locked);
          const total = free + locked;
          const usd =
            b.asset === "USDT" || b.asset === "BUSD" || b.asset === "USDC"
              ? total
              : total * (priceMap.get(`${b.asset}USDT`) ?? 0);
          return { asset: b.asset, free, locked, usdValue: usd };
        })
        .filter((b) => b.free + b.locked > 0)
        .sort((a, b) => b.usdValue - a.usdValue)
        .slice(0, 25);

      const since = Date.now() - 1000 * 60 * 60 * 24 * 60;
      const [dep, wd] = await Promise.all([
        signedRequest("/sapi/v1/capital/deposit/hisrec", { startTime: since }),
        signedRequest("/sapi/v1/capital/withdraw/history", { startTime: since }),
      ]);
      const [depRes, wdRes] = await Promise.all([
        binanceFetch(dep).catch(() => null),
        binanceFetch(wd).catch(() => null),
      ]);

      const deposits = depRes.ok
        ? ((await depRes.json()) as { amount: string; coin: string; network: string; status: number; address: string; txId: string; insertTime: number }[])
        : [];
      const withdrawals = wdRes.ok
        ? ((await wdRes.json()) as { amount: string; coin: string; network: string; status: number; address: string; txId?: string; applyTime: string }[])
        : [];

      return {
        connected: true,
        error: null as string | null,
        balances,
        totalUsd: balances.reduce((s, b) => s + b.usdValue, 0),
        deposits: deposits.slice(0, 30).map((d) => ({
          amount: Number(d.amount),
          coin: d.coin,
          network: d.network,
          status: d.status,
          address: d.address,
          txId: d.txId,
          time: new Date(d.insertTime).toISOString(),
        })),
        withdrawals: withdrawals.slice(0, 30).map((w) => ({
          amount: Number(w.amount),
          coin: w.coin,
          network: w.network,
          status: w.status,
          address: w.address,
          txId: w.txId ?? "",
          time: new Date(w.applyTime).toISOString(),
        })),
      };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "UNKNOWN";
      if (msg === "FORBIDDEN") throw e;
      return { connected: false, error: msg, balances: [] as Balance[], totalUsd: 0, deposits: [], withdrawals: [] };
    }
  });

/** Public crypto market prices + mining/crypto headlines for the forum news tab. */
export const getMarketNews = createServerFn({ method: "GET" }).handler(async () => {
  const [priceRes, newsRes] = await Promise.all([
    fetch(`${BINANCE_API}/api/v3/ticker/24hr`),
    fetch("https://min-api.cryptocompare.com/data/v2/news/?lang=EN&categories=Mining,BTC,ETH,Market"),
  ]);

  const watch = ["BTCUSDT", "ETHUSDT", "LTCUSDT", "DOGEUSDT", "KASUSDT", "BNBUSDT"];
  let tickers: { symbol: string; price: number; change: number }[] = [];
  if (priceRes.ok) {
    const all = (await priceRes.json()) as { symbol: string; lastPrice: string; priceChangePercent: string }[];
    tickers = all
      .filter((t) => watch.includes(t.symbol))
      .map((t) => ({ symbol: t.symbol.replace("USDT", ""), price: Number(t.lastPrice), change: Number(t.priceChangePercent) }));
  }

  let news: { id: string; title: string; url: string; source: string; image: string; published: string }[] = [];
  if (newsRes.ok) {
    const json = (await newsRes.json()) as {
      Data?: { id: string; title: string; url: string; source_info?: { name: string }; imageurl: string; published_on: number }[];
    };
    news = (json.Data ?? []).slice(0, 20).map((n) => ({
      id: String(n.id),
      title: n.title,
      url: n.url,
      source: n.source_info?.name ?? "Crypto",
      image: n.imageurl,
      published: new Date(n.published_on * 1000).toISOString(),
    }));
  }

  return { tickers, news };
});
