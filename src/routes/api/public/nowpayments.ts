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
  staticData: { sitemap: false },
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
        const orderId = String(payload["order_id"] ?? "");
        const paymentId = String(payload["payment_id"] ?? "");
        if (!orderId || !paymentId) return new Response("bad payload", { status: 400 });
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: deposit, error: lookupError } = await supabaseAdmin.from("deposit_history")
          .select("id,user_id,payment_id,gross_amount,status").eq("order_id", orderId).maybeSingle();
        if (lookupError) return new Response("lookup failed", { status: 500 });
        if (deposit?.payment_id && deposit.payment_id !== paymentId) return new Response("payment mismatch", { status: 400 });
        const mapped: Record<string, string> = { waiting: "pending", confirming: "confirming", confirmed: "confirming", sending: "confirming", partially_paid: "partial", failed: "failed", expired: "expired", refunded: "failed" };
        if (status !== "finished") {
          if (deposit && mapped[status] && deposit.status !== "completed") {
            const { error } = await supabaseAdmin.from("deposit_history").update({ status: mapped[status], updated_at: new Date().toISOString() })
              .eq("id", deposit.id).neq("status", "completed").neq("status", "cancelled");
            if (error) return new Response("update failed", { status: 500 });
          }
          return new Response("ok");
        }
        // Use the actual paid proportion; an underpayment must not credit the full requested amount.
        const requested = Number(payload["price_amount"] ?? 0);
        const payAmount = Number(payload["pay_amount"] ?? 0);
        const actuallyPaid = Number(payload["actually_paid"] ?? 0);
        if (!(requested > 0) || !(payAmount > 0) || !(actuallyPaid > 0)) return new Response("bad amount", { status: 400 });
        const amount = Math.round(Math.min(deposit ? Number(deposit.gross_amount) : requested, requested * actuallyPaid / payAmount) * 100) / 100;
        let userId = deposit?.user_id;
        if (!userId) {
          const depositTag = orderId.substring(0, orderId.lastIndexOf("-"));
          const { data: wallet } = await supabaseAdmin.from("wallets").select("user_id").eq("deposit_tag", depositTag).maybeSingle();
          userId = wallet?.user_id;
        }
        if (!userId) return new Response("unknown wallet", { status: 404 });
        if (deposit && !deposit.payment_id) {
          const { error } = await supabaseAdmin.from("deposit_history").update({ payment_id: paymentId }).eq("id", deposit.id);
          if (error) return new Response("update failed", { status: 500 });
        }
        const { error } = await supabaseAdmin.rpc("credit_deposit", { _user_id: userId, _amount: amount, _reference: paymentId });
        if (error) {
          console.error("credit_deposit failed", error);
          return new Response("error", { status: 500 });
        }

        return new Response("ok");
      },
    },
  },
});
