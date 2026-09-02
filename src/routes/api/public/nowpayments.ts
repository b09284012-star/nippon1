import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";

function sortedStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(sortedStringify).join(",")}]`;
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const body = Object.keys(obj)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${sortedStringify(obj[k])}`)
      .join(",");
    return `{${body}}`;
  }
  return JSON.stringify(value ?? null);
}

export const Route = createFileRoute("/api/public/nowpayments")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["NOWPAYMENTS_IPN_SECRET"];
        if (!secret) return new Response("not configured", { status: 503 });

        const raw = await request.text();
        const signature = request.headers.get("x-nowpayments-sig") ?? "";

        let payload: Record<string, unknown>;
        try {
          payload = JSON.parse(raw) as Record<string, unknown>;
        } catch {
          return new Response("bad payload", { status: 400 });
        }

        const expected = createHmac("sha512", secret).update(sortedStringify(payload)).digest("hex");
        const a = Buffer.from(signature);
        const b = Buffer.from(expected);
        if (a.length !== b.length || !timingSafeEqual(a, b)) {
          return new Response("invalid signature", { status: 401 });
        }

        const status = String(payload["payment_status"] ?? "");
        if (status !== "finished" && status !== "confirmed") {
          return new Response("ignored");
        }

        const orderId = String(payload["order_id"] ?? "");
        const depositTag = orderId.split("-").slice(0, 2).join("-");
        const amount = Number(payload["price_amount"] ?? 0);
        const paymentId = String(payload["payment_id"] ?? orderId);
        if (!depositTag || !Number.isFinite(amount) || amount <= 0) {
          return new Response("bad payload", { status: 400 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: wallet } = await supabaseAdmin
          .from("wallets")
          .select("user_id")
          .eq("deposit_tag", depositTag)
          .maybeSingle();
        if (!wallet) return new Response("unknown wallet", { status: 404 });

        const { error } = await supabaseAdmin.rpc("credit_deposit", {
          _user_id: wallet.user_id,
          _amount: amount,
          _reference: paymentId,
        });
        if (error) {
          console.error("credit_deposit failed", error);
          return new Response("error", { status: 500 });
        }

        return new Response("ok");
      },
    },
  },
});
