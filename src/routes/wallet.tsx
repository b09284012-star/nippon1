import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Copy, Wallet2, ShieldCheck, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import { formatUsd, formatDate } from "@/lib/media";
import { supabase } from "@/integrations/supabase/client";
import { createDepositAddress, getMyWallet } from "@/lib/wallet.functions";

const WITHDRAWAL_STATUS: Record<string, { label: string; variant: "secondary" | "default" | "destructive" | "outline" }> = {
  pending: { label: "قيد المراجعة", variant: "secondary" },
  completed: { label: "مكتمل", variant: "default" },
  rejected: { label: "مرفوض", variant: "destructive" },
};

export const Route = createFileRoute("/wallet")({
  head: () => ({
    meta: [
      { title: "المحفظة | Nippon" },
      {
        name: "description",
        content: "محفظة USDT خاصة بك: عنوان إيداع مستقل، الرصيد، المبالغ المحجوزة، وسجل العمليات.",
      },
      { property: "og:title", content: "المحفظة | Nippon" },
      { property: "og:description", content: "عنوان إيداع خاص لكل مستخدم مع حماية المشتري." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: WalletPage,
});

const TX_LABEL: Record<string, string> = {
  deposit: "إيداع",
  withdrawal: "سحب",
  escrow_hold: "حجز في الضمان",
  escrow_release: "تحرير من الضمان",
  escrow_refund: "استرجاع من الضمان",
  fee: "رسوم",
};

function WalletPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [amount, setAmount] = useState("100");
  const [wdAmount, setWdAmount] = useState("");
  const [wdAddress, setWdAddress] = useState("");
  const fetchWallet = useServerFn(getMyWallet);
  const createAddress = useServerFn(createDepositAddress);
  const qc = useQueryClient();

  const { data, refetch } = useQuery({
    queryKey: ["my-wallet"],
    enabled: Boolean(user),
    queryFn: () => fetchWallet(),
  });

  const withdrawals = useQuery({
    queryKey: ["my-withdrawals"],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from("withdrawals")
        .select("id, amount, address, network, status, reject_reason, created_at")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return rows ?? [];
    },
  });

  const deposit = useMutation({
    mutationFn: (amountUsd: number) => createAddress({ data: { amountUsd } }),
    onSuccess: () => {
      toast.success("تم إنشاء عنوان الإيداع الخاص بك");
      void refetch();
    },
    onError: (e: Error) => toast.error(e.message || "تعذر إنشاء العنوان"),
  });

  const withdraw = useMutation({
    mutationFn: async (vars: { amount: number; address: string }) => {
      const { error } = await supabase.rpc("request_withdrawal", {
        _amount: vars.amount,
        _address: vars.address,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("تم إرسال طلب السحب للمراجعة");
      setWdAmount("");
      setWdAddress("");
      void refetch();
      void qc.invalidateQueries({ queryKey: ["my-withdrawals"] });
    },
    onError: (e: Error) => toast.error(e.message || "تعذر إرسال طلب السحب"),
  });

  if (!loading && !user) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="font-display text-2xl font-black">المحفظة</h1>
        <p className="mt-2 text-sm text-muted-foreground">سجّل الدخول لعرض رصيدك وعنوان الإيداع.</p>
        <Button className="mt-6" onClick={() => navigate({ to: "/auth" })}>
          دخول / تسجيل
        </Button>
      </div>
    );
  }

  const wallet = data?.wallet;
  const created = deposit.data;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="font-display text-3xl font-black">
        محفظة <span className="neon-text">USDT</span>
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        رسوم الإيداع 1 دولار لكل عملية، وعمولة البيع 5% تُخصم عند تحرير المبلغ للبائع.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <Stat icon={Wallet2} label="الرصيد المتاح" value={formatUsd(wallet?.balance ?? 0)} />
        <Stat icon={ShieldCheck} label="محجوز في الضمان" value={formatUsd(wallet?.held ?? 0)} />
        <Stat
          icon={ArrowDownToLine}
          label="معرّف الإيداع الخاص بك"
          value={wallet?.deposit_tag ?? "—"}
        />
      </div>

      <div className="glass mt-8 rounded-3xl p-6">
        <h2 className="font-display text-xl font-bold">إيداع كريبتو</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          شبكة الإيداع: USDT — {wallet?.deposit_network ?? "TRC20"}
        </p>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <div className="w-40">
            <Label className="mb-2 block">المبلغ (دولار)</Label>
            <Input
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value.slice(0, 8))}
            />
          </div>
          <Button
            disabled={deposit.isPending}
            onClick={() => {
              const n = Number(amount);
              if (!Number.isFinite(n) || n < 10) {
                toast.error("أقل مبلغ للإيداع 10 دولار");
                return;
              }
              deposit.mutate(n);
            }}
          >
            {deposit.isPending ? "جارٍ الإنشاء…" : "أنشئ عنوان إيداع خاص بي"}
          </Button>
        </div>

        {(created?.address ?? wallet?.deposit_address) && (
          <div className="mt-6 rounded-2xl border border-border/60 bg-secondary/40 p-4">
            <div className="text-xs text-muted-foreground">عنوان الإيداع الخاص بك</div>
            <div className="mt-2 flex items-center gap-2">
              <code className="flex-1 overflow-x-auto whitespace-nowrap rounded-lg bg-background/70 px-3 py-2 text-sm">
                {created?.address ?? wallet?.deposit_address}
              </code>
              <Button
                variant="outline"
                size="icon"
                aria-label="نسخ العنوان"
                onClick={() => {
                  void navigator.clipboard.writeText(
                    (created?.address ?? wallet?.deposit_address) as string,
                  );
                  toast.success("تم نسخ العنوان");
                }}
              >
                <Copy className="size-4" />
              </Button>
            </div>
            {created && (
              <p className="mt-3 text-xs text-muted-foreground">
                أرسل {created.payAmount} {created.payCurrency.toUpperCase()} — سيُضاف لرصيدك{" "}
                {formatUsd(created.creditedUsd)} بعد خصم رسوم الإيداع (
                {formatUsd(created.feeUsd)}).
              </p>
            )}
          </div>
        )}
      </div>

      <div className="glass mt-8 rounded-3xl p-6">
        <h2 className="flex items-center gap-2 font-display text-xl font-bold">
          <ArrowUpFromLine className="size-5 text-primary" /> سحب الرصيد
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          يُخصم المبلغ فور إرسال الطلب ويُراجع يدويًا من الإدارة. في حال الرفض يُعاد المبلغ لرصيدك.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-[10rem_1fr_auto] sm:items-end">
          <div>
            <Label className="mb-2 block">المبلغ (USDT)</Label>
            <Input
              inputMode="decimal"
              value={wdAmount}
              onChange={(e) => setWdAmount(e.target.value.slice(0, 10))}
              placeholder="50"
            />
          </div>
          <div>
            <Label className="mb-2 block">عنوان المحفظة (TRC20)</Label>
            <Input
              value={wdAddress}
              onChange={(e) => setWdAddress(e.target.value.trim())}
              placeholder="T..."
            />
          </div>
          <Button
            disabled={withdraw.isPending}
            onClick={() => {
              const n = Number(wdAmount);
              if (!Number.isFinite(n) || n < 10) {
                toast.error("أقل مبلغ للسحب 10 USDT");
                return;
              }
              if (n > Number(wallet?.balance ?? 0)) {
                toast.error("الرصيد المتاح غير كافٍ");
                return;
              }
              if (wdAddress.length < 20) {
                toast.error("عنوان المحفظة غير صحيح");
                return;
              }
              withdraw.mutate({ amount: n, address: wdAddress });
            }}
          >
            {withdraw.isPending ? "جارٍ الإرسال…" : "طلب سحب"}
          </Button>
        </div>

        <div className="mt-6 divide-y divide-border/60 rounded-2xl border border-border/60">
          {(withdrawals.data ?? []).length === 0 && (
            <div className="px-4 py-6 text-sm text-muted-foreground">لا طلبات سحب بعد.</div>
          )}
          {(withdrawals.data ?? []).map((w) => {
            const s = WITHDRAWAL_STATUS[w.status] ?? { label: w.status, variant: "secondary" as const };
            return (
              <div key={w.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
                <Badge variant={s.variant}>{s.label}</Badge>
                <span className="font-display font-bold">{formatUsd(w.amount)}</span>
                <code className="max-w-[14rem] truncate text-xs text-muted-foreground">{w.address}</code>
                <span className="text-xs text-muted-foreground">{formatDate(w.created_at)}</span>
                {w.reject_reason && (
                  <span className="w-full text-xs text-destructive">سبب الرفض: {w.reject_reason}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>



      <div className="glass mt-8 overflow-hidden rounded-3xl">
        <h2 className="px-6 pt-6 font-display text-xl font-bold">سجل العمليات</h2>
        <div className="mt-4 divide-y divide-border/60">
          {(data?.transactions ?? []).length === 0 && (
            <div className="px-6 py-8 text-sm text-muted-foreground">لا عمليات بعد.</div>
          )}
          {(data?.transactions ?? []).map((t) => (
            <div key={t.id} className="flex items-center gap-3 px-6 py-4 text-sm">
              <Badge variant="secondary">{TX_LABEL[t.type] ?? t.type}</Badge>
              <span className="text-muted-foreground">{formatDate(t.created_at)}</span>
              <span
                className={
                  "ms-auto font-display font-bold " +
                  (Number(t.amount) < 0 ? "text-destructive" : "text-primary")
                }
              >
                {formatUsd(t.amount)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="glass card-3d rounded-2xl p-5">
      <Icon className="size-5 text-primary" />
      <div className="mt-3 text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 font-display text-xl font-black">{value}</div>
    </div>
  );
}
