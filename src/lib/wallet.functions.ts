import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { depositFee } from "@/lib/deposit-calculation";
export { DEPOSIT_FEE_RATE, depositFee } from "@/lib/deposit-calculation";

const NOWPAYMENTS_API = "https://api.nowpayments.io/v1";

/** Sale fee charged when escrow funds are released to the seller. */
export const SALE_FEE_RATE = 0.05;

/** Wallet + transactions for the signed-in user. */
export const getMyWallet = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [{ data: wallet }, { data: txs }] = await Promise.all([
      supabase
        .from("wallets")
        .select("balance, held, currency, deposit_address, deposit_tag, deposit_network, deposit_currency")
        .eq("user_id", userId)
        .maybeSingle(),
      supabase
        .from("wallet_transactions")
        .select("id, type, amount, status, reference, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50),
    ]);
    return { wallet: wallet ?? null, transactions: txs ?? [] };
  });

/**
 * Creates a dedicated NOWPayments deposit address for the signed-in user
 * and stores it on their wallet.
 */
const PAY_CURRENCY: Record<string, string> = {
  TRC20: "usdttrc20",
  BEP20: "usdtbsc",
  ERC20: "usdterc20",
};

const SITE_URL = "https://nipponminers.com";

export const createDepositAddress = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        amountUsd: z.number().min(10).max(100000),
        network: z.enum(["TRC20", "BEP20", "ERC20"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const apiKey = process.env["CRYPTO_WALLET_API_KEY"];
    if (!apiKey) throw new Error("مفتاح مزود الدفع غير مهيأ");

    const { supabase, userId } = context;
    const { data: wallet } = await supabase
      .from("wallets")
      .select("deposit_tag")
      .eq("user_id", userId)
      .maybeSingle();
    if (!wallet?.deposit_tag) throw new Error("المحفظة غير موجودة");

    const orderId = `${wallet.deposit_tag}-${Date.now()}`;
    const origin = process.env["PUBLIC_SITE_URL"] || SITE_URL;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: attempt, error: attemptError } = await supabaseAdmin.from("deposit_history").insert({
      user_id: userId, order_id: orderId, network: data.network,
      gross_amount: data.amountUsd, fee_amount: depositFee(data.amountUsd), fee_rate: 0,
      net_amount: data.amountUsd - depositFee(data.amountUsd),
    }).select("id").single();
    if (attemptError || !attempt) throw new Error("تعذر تسجيل الإيداع");

    const res = await fetch(`${NOWPAYMENTS_API}/payment`, {
      method: "POST",
      headers: { "x-api-key": apiKey, "content-type": "application/json" },
      body: JSON.stringify({
        price_amount: data.amountUsd,
        price_currency: "usd",
        pay_currency: PAY_CURRENCY[data.network],
        order_id: orderId,
        order_description: `Nippon wallet deposit (${wallet.deposit_tag})`,
        ipn_callback_url: `${origin}/api/public/nowpayments`,
      }),
    });

    if (!res.ok) {
      await supabaseAdmin.from("deposit_history").update({ status: "failed" }).eq("id", attempt.id);
      const body = await res.text();
      console.error("nowpayments create payment failed", res.status, body);
      if (body.toLowerCase().includes("less than minimal")) {
        throw new Error("المبلغ أقل من الحد الأدنى لهذه الشبكة، جرّب مبلغًا أكبر أو شبكة أخرى");
      }
      throw new Error("تعذر إنشاء عنوان الإيداع، حاول لاحقًا");
    }

    const payment = (await res.json()) as {
      payment_id: number | string;
      pay_address: string;
      pay_amount: number;
      pay_currency: string;
    };

    if (!payment.pay_address || !payment.payment_id) throw new Error("تعذر إنشاء عنوان الإيداع، حاول لاحقًا");
    const { error: savedError } = await supabaseAdmin.from("deposit_history").update({
      payment_id: String(payment.payment_id), address: payment.pay_address, status: "pending",
    }).eq("id", attempt.id);
    if (savedError) throw new Error("تعذر تسجيل الإيداع");
    return {
      id: attempt.id,
      address: payment.pay_address,
      // Request at least the full amount, rounding any higher provider quote up to cents.
      payAmount: Math.max(data.amountUsd, Number(payment.pay_amount) || 0) === data.amountUsd ? data.amountUsd : Math.ceil(Number(payment.pay_amount) * 100) / 100,
      network: data.network,
      paymentId: String(payment.payment_id),
      feeUsd: depositFee(data.amountUsd),
      creditedUsd: Math.max(data.amountUsd - depositFee(data.amountUsd), 0),
    };
  });
