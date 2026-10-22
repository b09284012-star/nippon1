import { t, useLanguage, numberLocale } from "@/lib/i18n";
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
import { getMyWallet } from "@/lib/wallet.functions";

const WITHDRAWAL_STATUS: Record<string, { label: string; variant: "secondary" | "default" | "destructive" | "outline" }> = {
  pending: { label: "قيد المراجعة", variant: "secondary" },
  completed: { label: "مكتمل", variant: "default" },
  rejected: { label: "مرفوض", variant: "destructive" },
};

export const Route = createFileRoute("/wallet")({
  head: () => ({
    meta: [
      { title: t("المحفظة | Nippon") },
      {
        name: "description",
        content: t("محفظة USDT خاصة بك: عنوان إيداع مستقل، الرصيد، المبالغ المحجوزة، وسجل العمليات."),
      },
      { property: "og:title", content: t("المحفظة | Nippon") },
      { property: "og:description", content: t("عنوان إيداع خاص لكل مستخدم مع حماية المشتري.") },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: WalletPage,
});

const DEPOSIT_NETWORKS = [
  { id: "TRC20", label: "TRC20", address: "TGX9Q1uR3A9g1pXQMzVRG7bx9GErbuZyHx" },
  { id: "BEP20", label: "BEP20", address: "0x369b227eee74f902376571e08fd11348a53da254" },
  { id: "ERC20", label: "ERC20", address: "0x369b227eee74f902376571e08fd11348a53da254" },
] as const;

const TX_LABEL: Record<string, string> = {
  deposit: "إيداع",
  withdrawal: "سحب",
  escrow_hold: "حجز في الضمان",
  escrow_release: "تحرير من الضمان",
  escrow_refund: "استرجاع من الضمان",
  fee: "رسوم",
};

function WalletPage() {
  useLanguage();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [wdAmount, setWdAmount] = useState("");
  const [wdAddress, setWdAddress] = useState("");
  const [depAmount, setDepAmount] = useState("");
  const [depFile, setDepFile] = useState<File | null>(null);
  const [network, setNetwork] = useState<string>("TRC20");
  const fetchWallet = useServerFn(getMyWallet);
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

  const deposits = useQuery({
    queryKey: ["my-deposit-requests"],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from("deposit_requests")
        .select("id, amount, status, admin_note, created_at")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return rows ?? [];
    },
  });

  const confirmDeposit = useMutation({
    mutationFn: async (vars: { amount: number; file: File | null }) => {
      let receiptPath: string | null = null;
      if (vars.file) {
        if (vars.file.size > 10 * 1024 * 1024) throw new Error(t("حجم الصورة أكبر من 10MB"));
        const ext = vars.file.name.split(".").pop() ?? "jpg";
        receiptPath = `${user!.id}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("deposit-receipts")
          .upload(receiptPath, vars.file, vars.file.type ? { contentType: vars.file.type } : {});
        if (upErr) throw upErr;
      }
      const { error } = await supabase.rpc("submit_deposit_confirmation", {
        _amount: vars.amount,
        ...(receiptPath ? { _receipt_path: receiptPath } : {}),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("تم إرسال تأكيد الإيداع للمراجعة"));
      setDepAmount("");
      setDepFile(null);
      void qc.invalidateQueries({ queryKey: ["my-deposit-requests"] });
    },
    onError: (e: Error) => toast.error(e.message || "تعذر إرسال تأكيد الإيداع"),
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
      toast.success(t("تم إرسال طلب السحب للمراجعة"));
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
        <h1 className="font-display text-2xl font-black">{t("المحفظة")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("سجّل الدخول لعرض رصيدك وعنوان الإيداع.")}</p>
        <Button className="mt-6" onClick={() => navigate({ to: "/auth" })}>
          {t("دخول / تسجيل")} </Button>
      </div>
    );
  }

  const wallet = data?.wallet;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="font-display text-3xl font-black">
        {t("محفظة")} <span className="neon-text">USDT</span>
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {t("رسوم الإيداع 1 دولار لكل عملية، ورسوم البيع 5% تُخصم عند تحرير المبلغ للبائع.")} </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <Stat icon={Wallet2} label={t("الرصيد المتاح")} value={formatUsd(wallet?.balance ?? 0)} />
        <Stat icon={ShieldCheck} label={t("محجوز في الضمان")} value={formatUsd(wallet?.held ?? 0)} />
        <Stat
          icon={ArrowDownToLine}
          label={t("معرّف الإيداع الخاص بك")}
          value={wallet?.deposit_tag ?? "—"}
        />
      </div>

      <div className="glass mt-8 rounded-3xl p-6">
        <h2 className="font-display text-xl font-bold">{t("إيداع كريبتو")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("اختر شبكة الإيداع، ثم أرسل USDT إلى العنوان الظاهر. يُضاف المبلغ لرصيدك بعد خصم رسوم الإيداع (1 دولار).")} </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {DEPOSIT_NETWORKS.map((n) => (
            <Button
              key={n.id}
              variant={network === n.id ? "default" : "outline"}
              size="sm"
              onClick={() => setNetwork(n.id)}
            >
              {n.label}
            </Button>
          ))}
        </div>

        {(() => {
          const net = DEPOSIT_NETWORKS.find((n) => n.id === network)!;
          return (
            <div className="mt-4 rounded-2xl border border-border/60 bg-secondary/40 p-4">
              <div className="text-xs text-muted-foreground">{t("عنوان الإيداع — USDT (")}{net.label})</div>
              <div className="mt-2 flex items-center gap-2">
                <code className="flex-1 overflow-x-auto whitespace-nowrap rounded-lg bg-background/70 px-3 py-2 text-sm" dir="ltr">
                  {net.address}
                </code>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label={t("نسخ العنوان")}
                  onClick={() => {
                    void navigator.clipboard.writeText(net.address);
                    toast.success(t("تم نسخ العنوان"));
                  }}
                >
                  <Copy className="size-4" />
                </Button>
              </div>
              <p className="mt-3 text-xs text-destructive">
                {t("تأكد من الإرسال عبر شبكة")} {net.label} {t("فقط، الإرسال عبر شبكة مختلفة قد يؤدي لفقدان المبلغ.")} </p>
            </div>
          );
        })()}

        <div className="mt-6 rounded-2xl border border-border/60 p-4">
          <h3 className="font-display font-bold">{t("تأكيد الإيداع")}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("بعد إرسال التحويل، أدخل القيمة وأرفق صورة سكرين التحويل، وسيراجعها الفريق ثم يُضاف المبلغ لرصيدك.")} </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="mb-2 block">{t("القيمة (USDT)")}</Label>
              <Input
                inputMode="decimal"
                value={depAmount}
                onChange={(e) => setDepAmount(e.target.value.slice(0, 10))}
                placeholder="100"
              />
            </div>
            <div>
              <Label className="mb-2 block">{t("صورة سكرين للتحويل")}</Label>
              <Input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => setDepFile(e.target.files?.[0] ?? null)}
              />
              <p className="mt-1 text-xs text-muted-foreground">{t("لقطة شاشة لإثبات التحويل (حتى 10MB).")}</p>
            </div>
          </div>
          <Button
            className="mt-4"
            disabled={confirmDeposit.isPending}
            onClick={() => {
              const n = Number(depAmount);
              if (!Number.isFinite(n) || n < 2) {
                toast.error(t("أقل قيمة إيداع 2 USDT"));
                return;
              }
              if (!depFile) {
                toast.error(t("أرفق صورة سكرين للتحويل"));
                return;
              }
              confirmDeposit.mutate({ amount: n, file: depFile });
            }}
          >
            {confirmDeposit.isPending ? t("جارٍ الإرسال…") : t("تأكيد الإيداع")}
          </Button>

          <div className="mt-6 divide-y divide-border/60 rounded-2xl border border-border/60">
            {(deposits.data ?? []).length === 0 && (
              <div className="px-4 py-6 text-sm text-muted-foreground">{t("لا طلبات تأكيد إيداع بعد.")}</div>
            )}
            {(deposits.data ?? []).map((d) => {
              const s = WITHDRAWAL_STATUS[d.status] ?? { label: d.status, variant: "secondary" as const };
              return (
                <div key={d.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
                  <Badge variant={s.variant}>{t(s.label)}</Badge>
                  <span className="font-display font-bold">{formatUsd(d.amount)}</span>
                  <span className="text-xs text-muted-foreground">{formatDate(d.created_at)}</span>
                  {d.admin_note && (
                    <span className="w-full text-xs text-destructive">{t("ملاحظة الإدارة:")} {d.admin_note}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="glass mt-8 rounded-3xl p-6">
        <h2 className="flex items-center gap-2 font-display text-xl font-bold">
          <ArrowUpFromLine className="size-5 text-primary" /> {t("سحب الرصيد")} </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("رسوم السحب 2.5 دولار تُضاف على المبلغ. يُخصم المبلغ مع الرسوم فور إرسال الطلب ويُراجع من الإدارة، وفي حال الرفض يُعاد كاملًا.")} </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-[10rem_1fr_auto] sm:items-end">
          <div>
            <Label className="mb-2 block">{t("المبلغ (USDT)")}</Label>
            <Input
              inputMode="decimal"
              value={wdAmount}
              onChange={(e) => setWdAmount(e.target.value.slice(0, 10))}
              placeholder="50"
            />
          </div>
          <div>
            <Label className="mb-2 block">{t("عنوان المحفظة (TRC20)")}</Label>
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
                toast.error(t("أقل مبلغ للسحب 10 USDT"));
                return;
              }
              if (n + 2.5 > Number(wallet?.balance ?? 0)) {
                toast.error(t("الرصيد غير كافٍ (المبلغ + رسوم 2.5 دولار)"));
                return;
              }
              if (wdAddress.length < 20) {
                toast.error(t("عنوان المحفظة غير صحيح"));
                return;
              }
              withdraw.mutate({ amount: n, address: wdAddress });
            }}
          >
            {withdraw.isPending ? t("جارٍ الإرسال…") : t("طلب سحب")}
          </Button>
        </div>

        <div className="mt-6 divide-y divide-border/60 rounded-2xl border border-border/60">
          {(withdrawals.data ?? []).length === 0 && (
            <div className="px-4 py-6 text-sm text-muted-foreground">{t("لا طلبات سحب بعد.")}</div>
          )}
          {(withdrawals.data ?? []).map((w) => {
            const s = WITHDRAWAL_STATUS[w.status] ?? { label: w.status, variant: "secondary" as const };
            return (
              <div key={w.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
                <Badge variant={s.variant}>{t(s.label)}</Badge>
                <span className="font-display font-bold">{formatUsd(w.amount)}</span>
                <code className="max-w-[14rem] truncate text-xs text-muted-foreground">{w.address}</code>
                <span className="text-xs text-muted-foreground">{formatDate(w.created_at)}</span>
                {w.reject_reason && (
                  <span className="w-full text-xs text-destructive">{t("سبب الرفض:")} {w.reject_reason}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>



      <div className="glass mt-8 overflow-hidden rounded-3xl">
        <h2 className="px-6 pt-6 font-display text-xl font-bold">{t("سجل العمليات")}</h2>
        <div className="mt-4 divide-y divide-border/60">
          {(data?.transactions ?? []).length === 0 && (
            <div className="px-6 py-8 text-sm text-muted-foreground">{t("لا عمليات بعد.")}</div>
          )}
          {(data?.transactions ?? []).map((transaction) => (
            <div key={transaction.id} className="flex items-center gap-3 px-6 py-4 text-sm">
              <Badge variant="secondary">{t(TX_LABEL[transaction.type] ?? transaction.type)}</Badge>
              <span className="text-muted-foreground">{formatDate(transaction.created_at)}</span>
              <span
                className={
                  "ms-auto font-display font-bold " +
                  (Number(transaction.amount) < 0 ? "text-destructive" : "text-primary")
                }
              >
                {formatUsd(transaction.amount)}
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
  useLanguage();
  return (
    <div className="glass card-3d rounded-2xl p-5">
      <Icon className="size-5 text-primary" />
      <div className="mt-3 text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 font-display text-xl font-black">{value}</div>
    </div>
  );
}
