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
import { useOnlineKeys } from "@/lib/presence";
import { cn } from "@/lib/utils";
import { useServerFn } from "@tanstack/react-start";
import { adminAccountAction, adminCreateCompany, adminListBans } from "@/lib/account.functions";

function CreateCompanyForm({ onDone }: { onDone: () => void }) {
  const create = useServerFn(adminCreateCompany);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true);
    try {
      await create({ data: { email, password, companyName: name } });
      toast.success("تم إنشاء حساب الشركة");
      setName(""); setEmail(""); setPassword("");
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تعذر إنشاء الحساب");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="glass rounded-2xl p-4">
      <div className="mb-3 flex items-center gap-2 font-display font-bold">
        <UserPlus className="size-4 text-primary" /> إنشاء حساب تجاري (شركة)
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        <Input value={name} onChange={(e) => setName(e.target.value.slice(0, 60))} placeholder="اسم الشركة" />
        <Input value={email} onChange={(e) => setEmail(e.target.value.slice(0, 120))} placeholder="البريد الإلكتروني" dir="ltr" type="email" />
        <Input value={password} onChange={(e) => setPassword(e.target.value.slice(0, 72))} placeholder="كلمة المرور" dir="ltr" type="text" />
      </div>
      <Button className="mt-3" size="sm" disabled={busy || !name.trim() || !email.trim() || password.length < 6} onClick={() => void submit()}>
        إنشاء الحساب
      </Button>
      <p className="mt-2 text-xs text-muted-foreground">يُنشأ الحساب مفعّلًا مباشرة وموسومًا كشركة، ويظهر في صفحة «شراء من الشركات» بعد اعتماده كبائع.</p>
    </div>
  );
}

function AccountActions({ userId, bannedUntil, onDone }: { userId: string; bannedUntil?: string | undefined; onDone: () => void }) {
  const act = useServerFn(adminAccountAction);
  const [days, setDays] = useState("7");
  const [busy, setBusy] = useState(false);
  const run = async (action: "ban" | "suspend" | "unban" | "delete", msg: string) => {
    if (action === "delete" && !confirm("حذف الحساب نهائيًا؟ لا يمكن التراجع.")) return;
    if (action === "ban" && !confirm("حظر الحساب بشكل دائم؟")) return;
    setBusy(true);
    try {
      await act({ data: { userId, action, days: Number(days) || 7 } });
      toast.success(msg);
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تعذر التنفيذ");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border/40 pt-3 text-sm">
      {bannedUntil ? (
        <>
          <Badge variant="destructive">
            {new Date(bannedUntil).getFullYear() > 2100 ? "محظور" : `معلّق حتى ${formatDate(bannedUntil)}`}
          </Badge>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => void run("unban", "تم رفع الحظر")}>رفع الحظر</Button>
        </>
      ) : (
        <>
          <Input className="h-8 w-20" type="number" min={1} max={365} value={days} onChange={(e) => setDays(e.target.value)} />
          <Button size="sm" variant="outline" disabled={busy} onClick={() => void run("suspend", "تم تعليق الحساب")}>تعليق (أيام)</Button>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => void run("ban", "تم حظر الحساب")}>حظر دائم</Button>
        </>
      )}
      <Button size="sm" variant="destructive" disabled={busy} onClick={() => void run("delete", "تم حذف الحساب")}>حذف الحساب</Button>
    </div>
  );
}

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "لوحة الإدارة | Nippon" },
      {
        name: "description",
        content: "مراجعة طلبات السحب، البائعين المعتمدين، النزاعات، وإدارة صلاحيات المستخدمين في Nippon.",
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
      const { data, error } = await supabase.rpc("admin_users_full");
      if (error) throw error;
      return data ?? [];
    },
  });
  const listBans = useServerFn(adminListBans);
  const companies = useQuery({
    queryKey: ["admin-companies"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id").eq("is_company", true);
      return new Set((data ?? []).map((r) => r.id));
    },
  });
  const bans = useQuery({ queryKey: ["admin-bans"], enabled: isAdmin, queryFn: () => listBans() });

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

  const onlineKeys = useOnlineKeys(isAdmin);

  const [q, setQ] = useState("");

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
        <StatCard icon={Radio} label="المستخدمون المتصلون الآن" value={String(onlineKeys.size)} live />
        <StatCard icon={Users} label="إجمالي المستخدمين" value={String(users.data?.length ?? stats.data?.total_users ?? 0)} />
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
          <TabsTrigger value="disputes">
            <Gavel className="size-4" /> النزاعات
          </TabsTrigger>
          <TabsTrigger value="notify">
            <BellRing className="size-4" /> إرسال إشعار
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


        <TabsContent value="users" className="mt-6 grid gap-3">
          <CreateCompanyForm onDone={() => { void users.refetch(); void companies.refetch(); }} />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value.slice(0, 60))}
            placeholder="ابحث بمعرّف المحفظة (NPN-...) أو الاسم أو البريد أو الهاتف"
          />
          {(["online", "offline"] as const).map((group) => {
            const list = (users.data ?? [])
              .filter((u) => {
                const t = q.trim().toLowerCase();
                if (!t) return true;
                return [u.deposit_tag, u.display_name, u.full_name, u.email, u.phone].some((v) => (v ?? "").toLowerCase().includes(t));
              })
              .filter((u) => (group === "online" ? onlineKeys.has(u.id) : !onlineKeys.has(u.id)));

            if (list.length === 0) return null;

            return (
              <div key={group} className="grid gap-3">
                <div className="flex items-center gap-2 px-1 text-xs font-bold text-muted-foreground">
                  <span
                    className={cn(
                      "size-2 rounded-full",
                      group === "online" ? "animate-pulse bg-primary" : "bg-muted-foreground/50",
                    )}
                  />
                  {group === "online" ? `متصلون الآن (${list.length})` : `غير متصلين (${list.length})`}
                </div>
                {list.map((u) => (
                  <div key={u.id} className="glass rounded-2xl p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={cn(
                          "size-2 rounded-full",
                          onlineKeys.has(u.id) ? "bg-primary" : "bg-muted-foreground/50",
                        )}
                      />
                      <span className="font-display font-bold">{u.display_name ?? "—"}</span>
                      {onlineKeys.has(u.id) && <Badge className="bg-primary/15 text-primary">متصل الآن</Badge>}
                      {u.is_admin && <Badge>مدير</Badge>}
                      {companies.data?.has(u.id) && <Badge variant="outline">شركة</Badge>}
                      {u.is_verified_seller && <Badge variant="secondary" className="gap-1"><ShieldCheck className="size-3.5" /> بائع معتمد</Badge>}
                      <code className="ms-auto text-xs" dir="ltr">{u.deposit_tag}</code>
                    </div>
                    <div className="mt-3 grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
                      <span>الاسم الحقيقي: {u.full_name || "—"}</span>
                      <span>البريد: {u.email}</span>
                      <span>الهاتف: {u.phone || "—"}</span>
                      <span>الدولة/المدينة: {[u.country, u.city].filter(Boolean).join(" - ") || "—"}</span>
                      <span className="sm:col-span-2">العنوان: {u.address || "—"}</span>
                      <span>الرصيد: {formatUsd(u.balance ?? 0)} • محجوز: {formatUsd(u.held ?? 0)}</span>
                      <span>التسجيل: {formatDate(u.created_at)}</span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-6 text-sm">
                      <label className="flex items-center gap-2">
                        <Switch
                          checked={Boolean(u.is_verified_seller)}
                          onCheckedChange={async (v) => {
                            const { error } = await supabase.rpc("admin_set_verified_seller", { _user_id: u.id, _verified: v });
                            if (error) toast.error(error.message);
                            else { toast.success(v ? "تم اعتماده كبائع" : "تم إلغاء الاعتماد"); void users.refetch(); }
                          }}
                        />
                        بائع معتمد
                      </label>
                      <label className="flex items-center gap-2">
                        <Switch
                          checked={Boolean(companies.data?.has(u.id))}
                          onCheckedChange={async (v) => {
                            const { error } = await supabase.rpc("admin_set_company", { _user_id: u.id, _company: v });
                            if (error) toast.error(error.message);
                            else { toast.success(v ? "تم تعيينه كشركة" : "أصبح حسابًا فرديًا"); void companies.refetch(); }
                          }}
                        />
                        حساب شركة
                      </label>
                      <label className="flex items-center gap-2">
                        <Switch
                          checked={Boolean(u.is_admin)}
                          disabled={u.id === user.id}
                          onCheckedChange={async (v) => {
                            const { error } = await supabase.rpc("admin_set_user_role", { _user_id: u.id, _make_admin: v });
                            if (error) toast.error(error.message);
                            else { toast.success("تم تحديث الصلاحية"); void users.refetch(); }
                          }}
                        />
                        مدير
                      </label>
                    </div>
                    {u.id !== user.id && <AccountActions userId={u.id} bannedUntil={bans.data?.[u.id]} onDone={() => { void bans.refetch(); void users.refetch(); }} />}
                  </div>
                ))}
              </div>
            );
          })}
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
              <Button
                size="sm"
                variant="outline"
                className="mt-3"
                onClick={async () => {
                  const { data, error } = await supabase.rpc("admin_dispute_conversation", { _order_id: d.order_id });
                  if (error || !data) toast.error(error?.message ?? "تعذر فتح الدردشة");
                  else void navigate({ to: "/chat/$id", params: { id: data } });
                }}
              >
                دخول دردشة البائع والمشتري
              </Button>
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

        <TabsContent value="notify" className="mt-6">
          <SendNotification users={(users.data ?? []) as { id: string; display_name: string; email: string | null }[]} />
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

function StatCard({
  icon: Icon,
  label,
  value,
  live,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  live?: boolean;
}) {
  return (
    <div className="glass card-3d rounded-2xl p-5">
      <div className="flex items-center gap-2">
        <Icon className="size-5 text-primary" />
        {live && <span className="size-2 animate-pulse rounded-full bg-primary" />}
      </div>
      <div className="mt-3 text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 font-display text-2xl font-black">{value}</div>
    </div>
  );
}

type DepositRowData = {
  id: string;
  display_name: string | null;
  email: string | null;
  amount: number;
  txid: string;
  receipt_number: string | null;
  receipt_image_path: string | null;
  status: string;
  admin_note: string | null;
  created_at: string;
};

function DepositRow({ d, onDone }: { d: DepositRowData; onDone: () => void }) {
  const [reason, setReason] = useState("");
  const [showReason, setShowReason] = useState(false);
  const receiptUrl = useStorageUrl("deposit-receipts", d.receipt_image_path);
  const [busy, setBusy] = useState(false);

  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex flex-wrap items-center gap-3">
        <span className="font-display font-bold">{d.display_name ?? d.email}</span>
        <Badge variant={d.status === "pending" ? "default" : "secondary"}>
          {WD_STATUS[d.status] ?? d.status}
        </Badge>
        <span className="ms-auto font-display text-lg font-black">{formatUsd(d.amount)}</span>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{d.email}</p>
      <code className="mt-2 block overflow-x-auto whitespace-nowrap rounded-lg bg-background/70 px-3 py-2 text-xs">
        TxID: {d.txid}
      </code>
      <p className="mt-2 text-xs text-muted-foreground">{formatDate(d.created_at)}</p>
      {d.admin_note && <p className="mt-2 text-xs text-destructive">ملاحظة: {d.admin_note}</p>}

      {d.status === "pending" && (
        <div className="mt-4 grid gap-3">
          <div className="flex gap-2">
            <Button
              size="sm"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                const { error } = await supabase.rpc("approve_deposit", { _id: d.id });
                setBusy(false);
                if (error) toast.error(error.message);
                else {
                  toast.success("تم اعتماد الإيداع وإضافة الرصيد");
                  onDone();
                }
              }}
            >
              اعتماد وإضافة الرصيد
            </Button>
            <Button size="sm" variant="destructive" onClick={() => setShowReason((v) => !v)}>
              رفض
            </Button>
          </div>
          {showReason && (
            <div className="flex gap-2">
              <Input placeholder="سبب الرفض" value={reason} onChange={(e) => setReason(e.target.value)} />
              <Button
                size="sm"
                variant="destructive"
                disabled={busy || reason.trim().length < 3}
                onClick={async () => {
                  setBusy(true);
                  const { error } = await supabase.rpc("reject_deposit", {
                    _id: d.id,
                    _reason: reason.trim(),
                  });
                  setBusy(false);
                  if (error) toast.error(error.message);
                  else {
                    toast.success("تم رفض طلب الإيداع");
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

function SendNotification({ users }: { users: { id: string; display_name: string; email: string | null }[] }) {
  const [target, setTarget] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const s = search.trim().toLowerCase();
  const matches = s
    ? users.filter((u) => u.display_name?.toLowerCase().includes(s) || u.email?.toLowerCase().includes(s)).slice(0, 8)
    : [];
  const selected = users.find((u) => u.id === target);

  const send = async () => {
    if (title.trim().length < 2) { toast.error("اكتب عنوان الإشعار"); return; }
    setBusy(true);
    const { data, error } = await supabase.rpc("admin_send_notification", {
      _user_id: (target === "all" ? null : target) as string,
      _title: title.trim(),
      _body: body.trim(),
      _link: null as unknown as string,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`تم الإرسال إلى ${data} مستخدم`);
    setTitle(""); setBody("");
  };

  return (
    <div className="glass grid max-w-xl gap-3 rounded-2xl p-5">
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant={target === "all" ? "default" : "outline"} onClick={() => setTarget("all")}>كل المستخدمين</Button>
        <Input className="flex-1" placeholder="أو ابحث عن مستخدم بالاسم أو البريد" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      {matches.length > 0 && (
        <div className="grid gap-1">
          {matches.map((u) => (
            <button key={u.id} className={cn("rounded-lg p-2 text-start text-sm hover:bg-secondary", target === u.id && "bg-primary/15")} onClick={() => { setTarget(u.id); setSearch(""); }}>
              {u.display_name} <span className="text-xs text-muted-foreground" dir="ltr">{u.email}</span>
            </button>
          ))}
        </div>
      )}
      <p className="text-xs text-muted-foreground">المستلم: {target === "all" ? "كل المستخدمين" : selected?.display_name ?? "—"}</p>
      <Input placeholder="عنوان الإشعار" value={title} onChange={(e) => setTitle(e.target.value.slice(0, 120))} />
      <Input placeholder="نص الإشعار" value={body} onChange={(e) => setBody(e.target.value.slice(0, 1000))} />
      <Button disabled={busy} onClick={() => void send()}>إرسال الإشعار</Button>
    </div>
  );
}
