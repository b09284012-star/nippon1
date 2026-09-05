import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { BellRing, ShieldCheck, Users, Wallet2, Gavel, ArrowDownToLine, Radio, UserPlus, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth";
import { formatDate, formatUsd } from "@/lib/media";
import { useOnlineCount } from "@/lib/presence";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "لوحة الإدارة | Nippon" },
      {
        name: "description",
        content: "مراجعة طلبات السحب، توثيق الهوية، النزاعات، وإدارة صلاحيات المستخدمين في Nippon.",
      },
      { property: "og:title", content: "لوحة الإدارة | Nippon" },
      { property: "og:description", content: "إدارة كاملة لمنصة Nippon لبيع أجهزة التعدين." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminPage,
});

const WD_STATUS: Record<string, string> = {
  pending: "قيد الانتظار",
  completed: "مكتمل",
  rejected: "مرفوض",
};

function AdminPage() {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();

  const withdrawals = useQuery({
    queryKey: ["admin-withdrawals"],
    enabled: isAdmin,
    refetchInterval: 20000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_list_withdrawals");
      if (error) throw error;
      return data ?? [];
    },
  });

  const users = useQuery({
    queryKey: ["admin-users"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_list_users");
      if (error) throw error;
      return data ?? [];
    },
  });

  const deposits = useQuery({
    queryKey: ["admin-deposits"],
    enabled: isAdmin,
    refetchInterval: 20000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_list_deposits");
      if (error) throw error;
      return data ?? [];
    },
  });

  const stats = useQuery({
    queryKey: ["admin-stats"],
    enabled: isAdmin,
    refetchInterval: 60000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_platform_stats");
      if (error) throw error;
      return data?.[0] ?? null;
    },
  });

  const onlineCount = useOnlineCount(isAdmin);

  const kyc = useQuery({
    queryKey: ["admin-kyc"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data } = await supabase
        .from("kyc_submissions")
        .select("*")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const disputes = useQuery({
    queryKey: ["admin-disputes"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data } = await supabase
        .from("disputes")
        .select("*, orders(amount, buyer_id, seller_id, status)")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  if (loading) return <div className="px-4 py-20 text-center text-muted-foreground">جارٍ التحميل…</div>;

  if (!user || !isAdmin) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="font-display text-2xl font-black">لوحة الإدارة</h1>
        <p className="mt-2 text-sm text-muted-foreground">هذه الصفحة مخصّصة للمدراء فقط.</p>
        <Button className="mt-6" onClick={() => navigate({ to: user ? "/" : "/auth" })}>
          {user ? "العودة للرئيسية" : "دخول"}
        </Button>
      </div>
    );
  }

  const pendingCount = (withdrawals.data ?? []).filter((w) => w.status === "pending").length;
  const pendingDeposits = (deposits.data ?? []).filter((d) => d.status === "pending").length;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-display text-3xl font-black">لوحة الإدارة</h1>
        {pendingCount > 0 && (
          <Badge className="gap-1 bg-accent text-accent-foreground">
            <BellRing className="size-3.5" /> {pendingCount} طلب سحب جديد
          </Badge>
        )}
        {pendingDeposits > 0 && (
          <Badge className="gap-1" variant="secondary">
            <ArrowDownToLine className="size-3.5" /> {pendingDeposits} تأكيد إيداع
          </Badge>
        )}
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Radio} label="المستخدمون المتصلون الآن" value={String(onlineCount)} live />
        <StatCard icon={Users} label="إجمالي المستخدمين" value={String(stats.data?.total_users ?? 0)} />
        <StatCard icon={UserPlus} label="حسابات جديدة (7 أيام)" value={String(stats.data?.new_users_7d ?? 0)} />
        <StatCard icon={Package} label="العروض / الطلبات" value={`${stats.data?.total_listings ?? 0} / ${stats.data?.total_orders ?? 0}`} />
      </div>

      <Tabs defaultValue="withdrawals" className="mt-8">
        <TabsList className="flex-wrap">
          <TabsTrigger value="withdrawals">
            <Wallet2 className="size-4" /> طلبات السحب
          </TabsTrigger>
          <TabsTrigger value="deposits">
            <ArrowDownToLine className="size-4" /> تأكيدات الإيداع
          </TabsTrigger>
          <TabsTrigger value="users">
            <Users className="size-4" /> إدارة المستخدمين
          </TabsTrigger>
          <TabsTrigger value="kyc">
            <ShieldCheck className="size-4" /> توثيق الهوية
          </TabsTrigger>
          <TabsTrigger value="disputes">
            <Gavel className="size-4" /> النزاعات
          </TabsTrigger>
        </TabsList>

        <TabsContent value="withdrawals" className="mt-6 grid gap-4">
          {(withdrawals.data ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">لا طلبات سحب.</p>
          )}
          {(withdrawals.data ?? []).map((w) => (
            <WithdrawalRow key={w.id} w={w} onDone={() => void withdrawals.refetch()} />
          ))}
        </TabsContent>

        <TabsContent value="deposits" className="mt-6 grid gap-4">
          {(deposits.data ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">لا تأكيدات إيداع.</p>
          )}
          {(deposits.data ?? []).map((d) => (
            <DepositRow key={d.id} d={d} onDone={() => void deposits.refetch()} />
          ))}
        </TabsContent>


        <TabsContent value="users" className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="text-start text-xs text-muted-foreground">
              <tr>
                <th className="p-3 text-start">الاسم</th>
                <th className="p-3 text-start">البريد الإلكتروني</th>
                <th className="p-3 text-start">الرصيد</th>
                <th className="p-3 text-start">الصلاحية</th>
                <th className="p-3 text-start">مدير</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {(users.data ?? []).map((u) => (
                <tr key={u.id} className="glass">
                  <td className="p-3">{u.display_name ?? "—"}</td>
                  <td className="p-3 text-muted-foreground">{u.email}</td>
                  <td className="p-3">{formatUsd(u.balance ?? 0)}</td>
                  <td className="p-3">
                    <Badge variant={u.is_admin ? "default" : "secondary"}>
                      {u.is_admin ? "مدير" : "مستخدم"}
                    </Badge>
                  </td>
                  <td className="p-3">
                    <Switch
                      checked={Boolean(u.is_admin)}
                      disabled={u.id === user.id}
                      onCheckedChange={async (v) => {
                        const { error } = await supabase.rpc("admin_set_user_role", {
                          _user_id: u.id,
                          _make_admin: v,
                        });
                        if (error) toast.error(error.message);
                        else {
                          toast.success("تم تحديث الصلاحية");
                          void users.refetch();
                        }
                      }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TabsContent>

        <TabsContent value="kyc" className="mt-6 grid gap-4">
          {(kyc.data ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">لا طلبات توثيق.</p>
          )}
          {(kyc.data ?? []).map((k) => (
            <div key={k.id} className="glass rounded-2xl p-5">
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-display font-bold">{k.full_name}</span>
                <Badge variant="secondary">{k.status}</Badge>
                <span className="text-xs text-muted-foreground">{formatDate(k.created_at)}</span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                رقم المستند: {k.document_number} — {k.country ?? "—"}
              </p>
              {k.status === "pending" && (
                <div className="mt-4 flex gap-2">
                  <Button
                    size="sm"
                    onClick={async () => {
                      const [a, b] = await Promise.all([
                        supabase
                          .from("kyc_submissions")
                          .update({ status: "approved", reviewed_at: new Date().toISOString() })
                          .eq("id", k.id),
                        supabase.from("profiles").update({ kyc_status: "approved" }).eq("id", k.user_id),
                      ]);
                      if (a.error || b.error) toast.error(a.error?.message ?? b.error?.message ?? "");
                      else {
                        toast.success("تم القبول");
                        void kyc.refetch();
                      }
                    }}
                  >
                    قبول
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={async () => {
                      const [a, b] = await Promise.all([
                        supabase
                          .from("kyc_submissions")
                          .update({ status: "rejected", reviewed_at: new Date().toISOString() })
                          .eq("id", k.id),
                        supabase.from("profiles").update({ kyc_status: "rejected" }).eq("id", k.user_id),
                      ]);
                      if (a.error || b.error) toast.error(a.error?.message ?? b.error?.message ?? "");
                      else {
                        toast.success("تم الرفض");
                        void kyc.refetch();
                      }
                    }}
                  >
                    رفض
                  </Button>
                </div>
              )}
            </div>
          ))}
        </TabsContent>

        <TabsContent value="disputes" className="mt-6 grid gap-4">
          {(disputes.data ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">لا نزاعات.</p>
          )}
          {(disputes.data ?? []).map((d) => (
            <div key={d.id} className="glass rounded-2xl p-5">
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant="secondary">{d.status}</Badge>
                <span className="text-xs text-muted-foreground">{formatDate(d.created_at)}</span>
              </div>
              <p className="mt-2 text-sm">{d.reason}</p>
              {d.status === "open" && (
                <div className="mt-4 flex gap-2">
                  <Button
                    size="sm"
                    onClick={async () => {
                      const { error } = await supabase.rpc("release_escrow", { _order_id: d.order_id });
                      if (error) toast.error(error.message);
                      else {
                        toast.success("تم تحرير المبلغ للبائع");
                        void disputes.refetch();
                      }
                    }}
                  >
                    تحرير للبائع
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={async () => {
                      const { error } = await supabase.rpc("refund_escrow", { _order_id: d.order_id });
                      if (error) toast.error(error.message);
                      else {
                        toast.success("تم استرجاع المبلغ للمشتري");
                        void disputes.refetch();
                      }
                    }}
                  >
                    استرجاع للمشتري
                  </Button>
                </div>
              )}
            </div>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}

type WithdrawalRowData = {
  id: string;
  display_name: string | null;
  email: string | null;
  amount: number;
  address: string;
  network: string;
  status: string;
  reject_reason: string | null;
  created_at: string;
};

function WithdrawalRow({ w, onDone }: { w: WithdrawalRowData; onDone: () => void }) {
  const [reason, setReason] = useState("");
  const [showReason, setShowReason] = useState(false);
  const [busy, setBusy] = useState(false);

  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex flex-wrap items-center gap-3">
        <span className="font-display font-bold">{w.display_name ?? w.email}</span>
        <Badge variant={w.status === "pending" ? "default" : "secondary"}>
          {WD_STATUS[w.status] ?? w.status}
        </Badge>
        <span className="ms-auto font-display text-lg font-black">{formatUsd(w.amount)}</span>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{w.email}</p>
      <code className="mt-2 block overflow-x-auto whitespace-nowrap rounded-lg bg-background/70 px-3 py-2 text-xs">
        {w.address} · {w.network}
      </code>
      <p className="mt-2 text-xs text-muted-foreground">{formatDate(w.created_at)}</p>
      {w.reject_reason && <p className="mt-2 text-xs text-destructive">سبب الرفض: {w.reject_reason}</p>}

      {w.status === "pending" && (
        <div className="mt-4 grid gap-3">
          <div className="flex gap-2">
            <Button
              size="sm"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                const { error } = await supabase.rpc("approve_withdrawal", { _id: w.id });
                setBusy(false);
                if (error) toast.error(error.message);
                else {
                  toast.success("تم اعتماد السحب");
                  onDone();
                }
              }}
            >
              موافقة
            </Button>
            <Button size="sm" variant="destructive" onClick={() => setShowReason((v) => !v)}>
              رفض
            </Button>
          </div>
          {showReason && (
            <div className="flex gap-2">
              <Input
                placeholder="سبب الرفض"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
              <Button
                size="sm"
                variant="destructive"
                disabled={busy || reason.trim().length < 3}
                onClick={async () => {
                  setBusy(true);
                  const { error } = await supabase.rpc("reject_withdrawal", {
                    _id: w.id,
                    _reason: reason.trim(),
                  });
                  setBusy(false);
                  if (error) toast.error(error.message);
                  else {
                    toast.success("تم الرفض وإرجاع المبلغ");
                    onDone();
                  }
                }}
              >
                تأكيد الرفض
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
