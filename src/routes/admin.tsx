import { t, useLanguage, numberLocale } from "@/lib/i18n";
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
import { formatDate, formatUsd, useStorageUrl } from "@/lib/media";
import { useOnlineKeys } from "@/lib/presence";
import { cn } from "@/lib/utils";
import { useServerFn } from "@tanstack/react-start";
import { adminAccountAction, adminListBans } from "@/lib/account.functions";
import { ForumModeration } from "@/components/site/ForumModeration";
import { DisputeSupervisorControl } from "@/components/site/DisputeSupervisorControl";

function AccountActions({ userId, bannedUntil, onDone }: { userId: string; bannedUntil?: string | undefined; onDone: () => void }) {
  const { t } = useLanguage();
  const act = useServerFn(adminAccountAction);
  const [days, setDays] = useState("7");
  const [busy, setBusy] = useState(false);
  const run = async (action: "ban" | "suspend" | "unban" | "delete", msg: string) => {
    if (action === "delete" && !confirm(t("حذف الحساب نهائيًا؟ لا يمكن التراجع."))) return;
    if (action === "ban" && !confirm(t("حظر الحساب بشكل دائم؟"))) return;
    setBusy(true);
    try {
      await act({ data: { userId, action, days: Number(days) || 7 } });
      toast.success(msg);
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("تعذر التنفيذ"));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border/40 pt-3 text-sm">
      {bannedUntil ? (
        <>
          <Badge variant="destructive">
            {new Date(bannedUntil).getFullYear() > 2100 ? t("محظور") : (t("معلّق حتى ") + (formatDate(bannedUntil)))}
          </Badge>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => void run("unban", t("تم رفع الحظر"))}>{t("رفع الحظر")}</Button>
        </>
      ) : (
        <>
          <Input className="h-8 w-20" type="number" min={1} max={365} value={days} onChange={(e) => setDays(e.target.value)} />
          <Button size="sm" variant="outline" disabled={busy} onClick={() => void run("suspend", t("تم تعليق الحساب"))}>{t("تعليق (أيام)")}</Button>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => void run("ban", t("تم حظر الحساب"))}>{t("حظر دائم")}</Button>
        </>
      )}
      <Button size="sm" variant="destructive" disabled={busy} onClick={() => void run("delete", t("تم حذف الحساب"))}>{t("حذف الحساب")}</Button>
    </div>
  );
}

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: t("لوحة الإدارة | Nippon") },
      {
        name: "description",
        content: t("مراجعة طلبات السحب، البائعين المعتمدين، النزاعات، وإدارة صلاحيات المستخدمين في Nippon."),
      },
      { property: "og:title", content: t("لوحة الإدارة | Nippon") },
      { property: "og:description", content: t("إدارة كاملة لمنصة Nippon لبيع أجهزة التعدين.") },
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
  const { t } = useLanguage();
  const [wdSearch, setWdSearch] = useState("");
  const [wdFilter, setWdFilter] = useState("all");
  const [dsSearch, setDsSearch] = useState("");
  const [dsFilter, setDsFilter] = useState("all");
  const { user, isAdmin, canModerateForum, canManageDisputes, loading, refreshProfile } = useAuth();
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
  const assignments = useQuery({ queryKey: ["staff-assignments", user?.id], enabled: isAdmin, queryFn: async () => {
    const { data, error } = await supabase.from("staff_assignments").select("user_id,responsibility,country");
    if (error) throw error;
    return data ?? [];
  } });
  const disputeNames = useQuery({ queryKey: ["dispute-names", user?.id], enabled: canManageDisputes, queryFn: async () => {
    const { data, error } = await supabase.rpc("staff_disputes");
    if (error) throw error;
    const ids = [...new Set((data ?? []).flatMap(d => {
      const order = d.orders as { buyer_id: string; seller_id: string } | null;
      return order ? [order.buyer_id, order.seller_id] : [];
    }))];
    if (!ids.length) return [];
    const result = await supabase.rpc("public_profile_names", { _ids: ids });
    if (result.error) throw result.error;
    return result.data ?? [];
  } });

  const disputes = useQuery({
    queryKey: ["admin-disputes", user?.id],
    enabled: canManageDisputes,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("staff_disputes");
      if (error) throw error;
      return (data ?? []).map(d => ({ ...d, orders: d.orders as { amount: number; buyer_id: string; seller_id: string; status: string; country: string | null } | null }));
    },
  });

  if (loading) return <div className="px-4 py-20 text-center text-muted-foreground">{t("جارٍ التحميل…")}</div>;

  if (!user || !(isAdmin || canModerateForum || canManageDisputes)) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="font-display text-2xl font-black">{t("لوحة الإدارة")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("هذه الصفحة مخصّصة للمدراء فقط.")}</p>
        <Button className="mt-6" onClick={() => navigate({ to: user ? "/" : "/auth" })}>
          {user ? t("العودة للرئيسية") : t("دخول")}
        </Button>
      </div>
    );
  }

  const nameOf = (id?: string | null) => {
    const u = (users.data ?? []).find((x: { id: string }) => x.id === id) as { display_name?: string; email?: string | null } | undefined;
    return u?.display_name || disputeNames.data?.find(p => p.id === id)?.display_name || (id ? id.slice(0, 8) : "—");
  };
  const dsQ = dsSearch.trim().toLowerCase();
  const sortedDisputes = (disputes.data ?? [])
    .filter((d) => dsFilter === "all" || (dsFilter === "open" ? d.status === "open" : d.status !== "open"))
    .filter((d) =>
      !dsQ ||
      [d.id, d.order_id, d.opened_by, d.reason, d.orders?.buyer_id, d.orders?.seller_id, nameOf(d.orders?.buyer_id), nameOf(d.orders?.seller_id)]
        .some((v) => String(v ?? "").toLowerCase().includes(dsQ)),
    )
    .sort((a, b) => {
      const ap = a.status === "open" ? 0 : 1;
      const bp = b.status === "open" ? 0 : 1;
      if (ap !== bp) return ap - bp;
      const d = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      return ap === 0 ? d : -d;
    });
  const pendingCount = (withdrawals.data ?? []).filter((w) => w.status === "pending").length;
  const wdQ = wdSearch.trim().toLowerCase();
  const sortedWithdrawals = (withdrawals.data ?? [])
    .filter((w) => wdFilter === "all" || w.status === wdFilter)
    .filter((w) =>
      !wdQ ||
      [w.user_id, w.id, w.display_name, w.email, w.address].some((v) => String(v ?? "").toLowerCase().includes(wdQ)),
    )
    .sort((a, b) => {
      const ap = a.status === "pending" ? 0 : 1;
      const bp = b.status === "pending" ? 0 : 1;
      if (ap !== bp) return ap - bp;
      const d = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      return ap === 0 ? d : -d;
    });
  const pendingDeposits = (deposits.data ?? []).filter((d) => d.status === "pending").length;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-display text-3xl font-black">{t("لوحة الإدارة")}</h1>
        {pendingCount > 0 && (
          <Badge className="gap-1 bg-accent text-accent-foreground">
            <BellRing className="size-3.5" /> {pendingCount} {t("طلب سحب جديد")} </Badge>
        )}
      </div>

      {isAdmin && <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Radio} label={t("المستخدمون المتصلون الآن")} value={String(onlineKeys.size)} live />
        <StatCard icon={Users} label={t("إجمالي المستخدمين")} value={String(users.data?.length ?? stats.data?.total_users ?? 0)} />
        <StatCard icon={UserPlus} label={t("حسابات جديدة (7 أيام)")} value={String(stats.data?.new_users_7d ?? 0)} />
        <StatCard icon={Package} label={t("العروض / الطلبات")} value={`${stats.data?.total_listings ?? 0} / ${stats.data?.total_orders ?? 0}`} />
      </div>}

      <Tabs defaultValue={isAdmin ? "withdrawals" : canManageDisputes ? "disputes" : "forum"} className="mt-8">
        <TabsList className="flex-wrap">
          {isAdmin && <TabsTrigger value="withdrawals">
            <Wallet2 className="size-4" /> {t("طلبات السحب")} </TabsTrigger>}
          {isAdmin && <TabsTrigger value="users">
            <Users className="size-4" /> {t("إدارة المستخدمين")} </TabsTrigger>}
          {canManageDisputes && <TabsTrigger value="disputes">
            <Gavel className="size-4" /> {t("النزاعات")} </TabsTrigger>}
          {isAdmin && <TabsTrigger value="notify">
            <BellRing className="size-4" /> {t("إرسال إشعار")} </TabsTrigger>}
          {canModerateForum && <TabsTrigger value="forum">{t("إدارة المنتدى")}</TabsTrigger>}
        </TabsList>

        {isAdmin && <TabsContent value="withdrawals" className="mt-6 grid gap-4">
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <Input
              className="min-w-0"
              placeholder={t("ابحث بالمعرف أو الاسم أو البريد أو العنوان")}
              value={wdSearch}
              onChange={(e) => setWdSearch(e.target.value)}
            />
            <select
              className="h-9 rounded-md border border-input bg-background px-2 text-sm"
              value={wdFilter}
              onChange={(e) => setWdFilter(e.target.value)}
            >
              <option value="all">{t("الكل")}</option>
              <option value="pending">{t("قيد المراجعة")}</option>
              <option value="completed">{t("مكتمل")}</option>
              <option value="rejected">{t("مرفوض")}</option>
            </select>
          </div>
          {sortedWithdrawals.length === 0 && (
            <p className="text-sm text-muted-foreground">{t("لا طلبات سحب.")}</p>
          )}
          {sortedWithdrawals.map((w) => (
            <WithdrawalRow key={w.id} w={w} onDone={() => void withdrawals.refetch()} />
          ))}
        </TabsContent>}



        {isAdmin && <TabsContent value="users" className="mt-6 grid gap-3">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value.slice(0, 60))}
            placeholder={t("ابحث بمعرّف المحفظة (NPN-...) أو الاسم أو البريد أو الهاتف")}
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
                  {group === "online" ? (t("متصلون الآن (") + (list.length) + ")") : (t("غير متصلين (") + (list.length) + ")")}
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
                      {onlineKeys.has(u.id) && <Badge className="bg-primary/15 text-primary">{t("متصل الآن")}</Badge>}
                      {u.is_admin && <Badge>{t("مدير")}</Badge>}
                      {u.is_verified_seller && <Badge variant="secondary" className="gap-1"><ShieldCheck className="size-3.5" /> {t("بائع معتمد")}</Badge>}
                      <code className="ms-auto text-xs" dir="ltr">{u.deposit_tag}</code>
                    </div>
                    <div className="mt-3 grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
                      <span>{t("الاسم الحقيقي:")} {u.full_name || "—"}</span>
                      <span>{t("البريد:")} {u.email}</span>
                      <span>{t("الهاتف:")} {u.phone || "—"}</span>
                      <span>{t("الدولة/المدينة:")} {[u.country, u.city].filter(Boolean).join(" - ") || "—"}</span>
                      <span className="sm:col-span-2">{t("العنوان:")} {u.address || "—"}</span>
                      <span>{t("الرصيد:")} {formatUsd(u.balance ?? 0)} {t("• محجوز:")} {formatUsd(u.held ?? 0)}</span>
                      <span>{t("التسجيل:")} {formatDate(u.created_at)}</span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-6 text-sm">
                      <label className="flex items-center gap-2">
                        <Switch
                          checked={Boolean(u.is_verified_seller)}
                          onCheckedChange={async (v) => {
                            const { error } = await supabase.rpc("admin_set_verified_seller", { _user_id: u.id, _verified: v });
                            if (error) toast.error(error.message);
                            else { toast.success(v ? t("تم اعتماده كبائع") : t("تم إلغاء الاعتماد")); void users.refetch(); }
                          }}
                        />
                        {t("بائع معتمد")} </label>
                      <label className="flex items-center gap-2">
                        <Switch
                          checked={Boolean(u.is_admin)}
                          disabled={u.id === user.id}
                          onCheckedChange={async (v) => {
                            const { error } = await supabase.rpc("admin_set_user_role", { _user_id: u.id, _make_admin: v });
                            if (error) toast.error(error.message);
                            else { toast.success(t("تم تحديث الصلاحية")); void users.refetch(); }
                          }}
                        />
                        {t("المدير العام")} </label>
                      {(["forum"] as const).map(responsibility => <label key={responsibility} className="flex items-center gap-2">
                        <Switch checked={Boolean(assignments.data?.some(a => a.user_id === u.id && a.responsibility === responsibility))} onCheckedChange={async enabled => {
                          const { error } = await supabase.rpc("assign_staff", { _user_id: u.id, _responsibility: responsibility, _enabled: enabled });
                          if (error) toast.error(error.message);
                          else { toast.success(t("تم تحديث الصلاحية")); void assignments.refetch(); void refreshProfile(); }
                        }} />{t("أدمن المنتدى")}
                      </label>)}
                      <DisputeSupervisorControl
                        key={`${u.id}-${assignments.data?.find(a => a.user_id === u.id && a.responsibility === "disputes")?.country ?? ""}`}
                        userId={u.id}
                        enabled={Boolean(assignments.data?.some(a => a.user_id === u.id && a.responsibility === "disputes"))}
                        country={assignments.data?.find(a => a.user_id === u.id && a.responsibility === "disputes")?.country ?? null}
                        onDone={() => { void assignments.refetch(); void refreshProfile(); }}
                      />
                    </div>
                    {u.id !== user.id && <AccountActions userId={u.id} bannedUntil={bans.data?.[u.id]} onDone={() => { void bans.refetch(); void users.refetch(); }} />}
                  </div>
                ))}
              </div>
            );
          })}
        </TabsContent>}

        {canManageDisputes && <TabsContent value="disputes" className="mt-6 grid gap-4">
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <Input
              className="min-w-0"
              placeholder={t("ابحث بالمعرف أو الاسم أو السبب")}
              value={dsSearch}
              onChange={(e) => setDsSearch(e.target.value)}
            />
            <select
              className="h-9 rounded-md border border-input bg-background px-2 text-sm"
              value={dsFilter}
              onChange={(e) => setDsFilter(e.target.value)}
            >
              <option value="all">{t("الكل")}</option>
              <option value="open">{t("مفتوح")}</option>
              <option value="closed">{t("مغلق")}</option>
            </select>
          </div>
          {sortedDisputes.length === 0 && (
            <p className="text-sm text-muted-foreground">{t("لا نزاعات.")}</p>
          )}
          {sortedDisputes.map((d) => (
            <div key={d.id} className={cn("glass min-w-0 rounded-2xl p-4", d.status === "open" && "border-s-4 border-s-warning")}>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={d.status === "open" ? "default" : "secondary"}>{d.status === "open" ? t("مفتوح") : t("مغلق")}</Badge>
                {d.orders?.country && <Badge variant="outline">{t(d.orders.country)}</Badge>}
                <span className="ms-auto font-display font-black">{formatUsd(Number(d.orders?.amount ?? 0))}</span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div className="min-w-0 rounded-lg bg-background/60 p-2"><span className="text-muted-foreground">{t("المشتري")}</span><p className="truncate font-bold">{nameOf(d.orders?.buyer_id)}</p></div>
                <div className="min-w-0 rounded-lg bg-background/60 p-2"><span className="text-muted-foreground">{t("البائع")}</span><p className="truncate font-bold">{nameOf(d.orders?.seller_id)}</p></div>
              </div>
              <p className="mt-3 break-words text-sm">{d.reason}</p>
              <p className="mt-2 text-xs text-muted-foreground">{formatDate(d.created_at)}</p>
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
                {t("دخول دردشة البائع والمشتري")} </Button>
              {d.status === "open" && (
                <div className="mt-4 flex gap-2">
                  <Button
                    size="sm"
                    onClick={async () => {
                      if (!confirm(t("تأكيد حسم النزاع وتحرير المبلغ للبائع؟"))) return;
                      const { error } = await supabase.rpc("resolve_staff_dispute", { _order_id: d.order_id, _refund: false });
                      if (error) toast.error(error.message);
                      else {
                        toast.success(t("تم تحرير المبلغ للبائع"));
                        void disputes.refetch();
                      }
                    }}
                  >
                    {t("تحرير للبائع")} </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={async () => {
                      if (!confirm(t("تأكيد حسم النزاع وإرجاع المبلغ للمشتري؟"))) return;
                      const { error } = await supabase.rpc("resolve_staff_dispute", { _order_id: d.order_id, _refund: true });
                      if (error) toast.error(error.message);
                      else {
                        toast.success(t("تم استرجاع المبلغ للمشتري"));
                        void disputes.refetch();
                      }
                    }}
                  >
                    {t("استرجاع للمشتري")} </Button>
                </div>
              )}
            </div>
          ))}
        </TabsContent>}

        {isAdmin && <TabsContent value="notify" className="mt-6">
          <SendNotification users={(users.data ?? []) as { id: string; display_name: string; email: string | null }[]} />
        </TabsContent>}
        {canModerateForum && <TabsContent value="forum" className="mt-6"><ForumModeration /></TabsContent>}
      </Tabs>
    </div>
  );
}

type WithdrawalRowData = {
  id: string;
  user_id?: string;
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
  const { t } = useLanguage();
  const [reason, setReason] = useState("");
  const [showReason, setShowReason] = useState(false);
  const [busy, setBusy] = useState(false);

  return (
    <div className={cn("glass min-w-0 overflow-hidden rounded-2xl p-4", w.status === "pending" && "border-s-4 border-s-primary")}>
      <div className="flex items-start gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/15 font-display font-black text-primary">
          {(w.display_name ?? w.email ?? "?").charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display font-bold">{w.display_name ?? w.email}</p>
          <p className="truncate text-xs text-muted-foreground">{w.email}</p>
        </div>
        <div className="shrink-0 text-end">
          <p className="font-display text-lg font-black">{formatUsd(w.amount)}</p>
          <Badge variant={w.status === "pending" ? "default" : "secondary"}>
            {t(WD_STATUS[w.status] ?? w.status)}
          </Badge>
        </div>
      </div>
      <div className="mt-3 rounded-lg bg-background/70 p-3">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{t("عنوان السحب")}</span>
          <Badge variant="outline">{w.network}</Badge>
        </div>
        <code dir="ltr" className="mt-1 block break-all text-xs">{w.address}</code>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{formatDate(w.created_at)}</p>
      {w.reject_reason && <p className="mt-2 text-xs text-destructive">{t("سبب الرفض:")} {w.reject_reason}</p>}

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
                  toast.success(t("تم اعتماد السحب"));
                  onDone();
                }
              }}
            >
              {t("موافقة")} </Button>
            <Button size="sm" variant="destructive" onClick={() => setShowReason((v) => !v)}>
              {t("رفض")} </Button>
          </div>
          {showReason && (
            <div className="flex gap-2">
              <Input
                placeholder={t("سبب الرفض")}
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
                    toast.success(t("تم الرفض وإرجاع المبلغ"));
                    onDone();
                  }
                }}
              >
                {t("تأكيد الرفض")} </Button>
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
  const { t } = useLanguage();
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
  receipt_image_path: string | null;
  status: string;
  admin_note: string | null;
  created_at: string;
};

function DepositRow({ d, onDone }: { d: DepositRowData; onDone: () => void }) {
  const { t } = useLanguage();
  const [reason, setReason] = useState("");
  const [showReason, setShowReason] = useState(false);
  const receiptUrl = useStorageUrl("deposit-receipts", d.receipt_image_path);
  const [busy, setBusy] = useState(false);

  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex flex-wrap items-center gap-3">
        <span className="font-display font-bold">{d.display_name ?? d.email}</span>
        <Badge variant={d.status === "pending" ? "default" : "secondary"}>
          {t(WD_STATUS[d.status] ?? d.status)}
        </Badge>
        <span className="ms-auto font-display text-lg font-black">{formatUsd(d.amount)}</span>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{d.email}</p>
      <code className="mt-2 block overflow-x-auto whitespace-nowrap rounded-lg bg-background/70 px-3 py-2 text-xs" dir="ltr">
        {t("مرجع الطلب:")} {d.txid}
      </code>
      {d.receipt_image_path && (
        <a href={receiptUrl.data ?? undefined} target="_blank" rel="noreferrer" className="mt-2 block">
          {receiptUrl.data ? (
            <img
              src={receiptUrl.data}
              alt={t("سكرين التحويل")}
              className="max-h-48 rounded-xl border border-border/60 object-contain"
            />
          ) : (
            <span className="text-xs text-muted-foreground">{t("جارٍ تحميل صورة السكرين…")}</span>
          )}
        </a>
      )}
      <p className="mt-2 text-xs text-muted-foreground">{formatDate(d.created_at)}</p>
      {d.admin_note && <p className="mt-2 text-xs text-destructive">{t("ملاحظة:")} {d.admin_note}</p>}

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
                  toast.success(t("تم اعتماد الإيداع وإضافة الرصيد"));
                  onDone();
                }
              }}
            >
              {t("اعتماد وإضافة الرصيد")} </Button>
            <Button size="sm" variant="destructive" onClick={() => setShowReason((v) => !v)}>
              {t("رفض")} </Button>
          </div>
          {showReason && (
            <div className="flex gap-2">
              <Input placeholder={t("سبب الرفض")} value={reason} onChange={(e) => setReason(e.target.value)} />
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
                    toast.success(t("تم رفض طلب الإيداع"));
                    onDone();
                  }
                }}
              >
                {t("تأكيد الرفض")} </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SendNotification({ users }: { users: { id: string; display_name: string; email: string | null }[] }) {
  const { t } = useLanguage();
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
    if (title.trim().length < 2) { toast.error(t("اكتب عنوان الإشعار")); return; }
    setBusy(true);
    const { data, error } = await supabase.rpc("admin_send_notification", {
      _user_id: (target === "all" ? null : target) as string,
      _title: title.trim(),
      _body: body.trim(),
      _link: null as unknown as string,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success((t("تم الإرسال إلى ") + (data) + t(" مستخدم")));
    setTitle(""); setBody("");
  };

  return (
    <div className="glass grid max-w-xl gap-3 rounded-2xl p-5">
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant={target === "all" ? "default" : "outline"} onClick={() => setTarget("all")}>{t("كل المستخدمين")}</Button>
        <Input className="flex-1" placeholder={t("أو ابحث عن مستخدم بالاسم أو البريد")} value={search} onChange={(e) => setSearch(e.target.value)} />
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
      <p className="text-xs text-muted-foreground">{t("المستلم:")} {target === "all" ? t("كل المستخدمين") : selected?.display_name ?? "—"}</p>
      <Input placeholder={t("عنوان الإشعار")} value={title} onChange={(e) => setTitle(e.target.value.slice(0, 120))} />
      <Input placeholder={t("نص الإشعار")} value={body} onChange={(e) => setBody(e.target.value.slice(0, 1000))} />
      <Button disabled={busy} onClick={() => void send()}>{t("إرسال الإشعار")}</Button>
    </div>
  );
}
