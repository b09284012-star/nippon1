import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Coins, ArrowDownToLine, ArrowUpFromLine, RefreshCw, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth";
import { formatDate, formatUsd } from "@/lib/media";
import { getBinanceOverview } from "@/lib/finance.functions";

export const Route = createFileRoute("/finance")({
  head: () => ({
    meta: [
      { title: "اللوحة المالية | Nippon" },
      {
        name: "description",
        content: "لوحة مالية مستقلة تعرض رصيد باينانس الفعلي وسجل الإيداعات والسحوبات لإدارة Nippon.",
      },
      { property: "og:title", content: "اللوحة المالية | Nippon" },
      { property: "og:description", content: "رصيد الأصول وسجل الحوالات لحظيًا." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: FinancePage,
});

function FinancePage() {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const fetchOverview = useServerFn(getBinanceOverview);

  const overview = useQuery({
    queryKey: ["binance-overview"],
    enabled: isAdmin,
    refetchInterval: 60000,
    queryFn: () => fetchOverview(),
  });

  if (loading) return <div className="px-4 py-20 text-center text-muted-foreground">جارٍ التحميل…</div>;

  if (!user || !isAdmin) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <Lock className="mx-auto size-8 text-muted-foreground" />
        <h1 className="mt-4 font-display text-2xl font-black">اللوحة المالية</h1>
        <p className="mt-2 text-sm text-muted-foreground">هذه اللوحة مغلقة ومخصّصة للإدارة فقط.</p>
        <Button className="mt-6" onClick={() => navigate({ to: user ? "/" : "/auth" })}>
          {user ? "العودة للرئيسية" : "دخول"}
        </Button>
      </div>
    );
  }

  const data = overview.data;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-display text-3xl font-black">اللوحة المالية</h1>
        <Badge variant={data?.connected ? "default" : "secondary"}>
          {data?.connected ? "متصل بباينانس" : "غير متصل"}
        </Badge>
        <Button
          variant="outline"
          size="sm"
          className="ms-auto"
          onClick={() => void overview.refetch()}
          disabled={overview.isFetching}
        >
          <RefreshCw className="size-4" /> تحديث
        </Button>
      </div>

      {data && !data.connected && (
        <div className="glass mt-6 rounded-2xl p-5 text-sm text-muted-foreground">
          {data.error === "BINANCE_KEYS_MISSING"
            ? "لم يتم حفظ مفاتيح باينانس بعد. أضف مفتاح الـ API والمفتاح السري (صلاحية قراءة فقط) لتظهر الأرصدة والحوالات هنا."
            : "تعذر الاتصال بباينانس. السبب الظاهر من باينانس:"}
          {data.error && data.error !== "BINANCE_KEYS_MISSING" && (
            <code className="mt-3 block overflow-x-auto whitespace-nowrap rounded-lg bg-background/70 px-3 py-2 text-xs" dir="ltr">
              {data.error}
            </code>
          )}
        </div>
      )}

      <div className="glass mt-8 rounded-3xl p-6">
        <Coins className="size-5 text-primary" />
        <div className="mt-3 text-xs text-muted-foreground">القيمة الإجمالية للأصول</div>
        <div className="mt-1 font-display text-4xl font-black">{formatUsd(data?.totalUsd ?? 0)}</div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {(data?.balances ?? []).map((b) => (
          <div key={b.asset} className="glass card-3d rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <span className="font-display text-lg font-black">{b.asset}</span>
              <span className="text-sm text-muted-foreground">{formatUsd(b.usdValue)}</span>
            </div>
            <div className="mt-2 text-sm">
              متاح: {b.free.toLocaleString("en-US", { maximumFractionDigits: 8 })}
            </div>
            <div className="text-xs text-muted-foreground">
              محجوز: {b.locked.toLocaleString("en-US", { maximumFractionDigits: 8 })}
            </div>
          </div>
        ))}
      </div>

      <Tabs defaultValue="deposits" className="mt-10">
        <TabsList>
          <TabsTrigger value="deposits">
            <ArrowDownToLine className="size-4" /> الإيداعات
          </TabsTrigger>
          <TabsTrigger value="withdrawals">
            <ArrowUpFromLine className="size-4" /> السحوبات
          </TabsTrigger>
        </TabsList>

        <TabsContent value="deposits" className="mt-6 grid gap-3">
          {(data?.deposits ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">لا عمليات إيداع في آخر 60 يومًا.</p>
          )}
          {(data?.deposits ?? []).map((d) => (
            <TxRow
              key={`${d.txId}-${d.time}`}
              amount={d.amount}
              coin={d.coin}
              network={d.network}
              address={d.address}
              txId={d.txId}
              time={d.time}
              ok={d.status === 1}
            />
          ))}
        </TabsContent>

        <TabsContent value="withdrawals" className="mt-6 grid gap-3">
          {(data?.withdrawals ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">لا عمليات سحب في آخر 60 يومًا.</p>
          )}
          {(data?.withdrawals ?? []).map((w) => (
            <TxRow
              key={`${w.txId}-${w.time}`}
              amount={w.amount}
              coin={w.coin}
              network={w.network}
              address={w.address}
              txId={w.txId}
              time={w.time}
              ok={w.status === 6}
            />
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function TxRow({
  amount,
  coin,
  network,
  address,
  txId,
  time,
  ok,
}: {
  amount: number;
  coin: string;
  network: string;
  address: string;
  txId: string;
  time: string;
  ok: boolean;
}) {
  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="font-display text-lg font-black">
          {amount} {coin}
        </span>
        <Badge variant={ok ? "default" : "secondary"}>{ok ? "مكتمل" : "قيد المعالجة"}</Badge>
        <span className="text-xs text-muted-foreground">{network}</span>
        <span className="ms-auto text-xs text-muted-foreground">{formatDate(time)}</span>
      </div>
      <code className="mt-2 block overflow-x-auto whitespace-nowrap rounded-lg bg-background/70 px-3 py-2 text-xs">
        {address}
      </code>
      {txId && (
        <code className="mt-1 block overflow-x-auto whitespace-nowrap text-[11px] text-muted-foreground">
          TxID: {txId}
        </code>
      )}
    </div>
  );
}
