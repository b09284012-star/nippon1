import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/lib/i18n";
import { forumMembers, moderateForumAccount } from "@/lib/community.functions";
import { useAuth } from "@/lib/auth";

export function ForumModeration() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const fetchMembers = useServerFn(forumMembers);
  const moderate = useServerFn(moderateForumAccount);
  const members = useQuery({ queryKey: ["forum-members", user?.id], queryFn: () => fetchMembers() });
  const run = async (id: string, banned: boolean) => {
    if (!confirm(t(banned ? "حظر الحساب بشكل دائم؟" : "رفع الحظر؟"))) return;
    setBusy(true);
    try { await moderate({ data: { userId: id, banned } }); toast.success(t(banned ? "تم حظر الحساب" : "تم رفع الحظر")); }
    catch (error) { toast.error(error instanceof Error ? error.message : t("تعذر التنفيذ")); }
    finally { setBusy(false); }
  };
  return <section className="grid gap-4">
    <Button asChild variant="outline" className="justify-self-start"><Link to="/forum">{t("إدارة منتديات الدول")}</Link></Button>
    <Input aria-label={t("ابحث بالاسم المستعار أو معرف المستخدم")} placeholder={t("ابحث بالاسم المستعار أو معرف المستخدم")} value={search} onChange={e => setSearch(e.target.value)} />
    {members.isError && <p className="text-destructive">{t("تعذر تحميل المستخدمين")}</p>}
    {(members.data ?? []).filter(p => p.id !== user?.id && (!search.trim() || [p.id, p.display_name].some(v => v.toLowerCase().includes(search.trim().toLowerCase())))).slice(0, 100).map(p => <div key={p.id} className="flex flex-wrap items-center gap-3 border-b border-border py-3">
      <div className="min-w-0 flex-1"><p className="font-bold">{p.display_name}</p><code className="block break-all text-xs text-muted-foreground" dir="ltr">{p.id}</code></div>
      <Button size="sm" variant="destructive" disabled={busy} onClick={() => void run(p.id, true)}>{t("حظر دائم")}</Button>
      <Button size="sm" variant="outline" disabled={busy} onClick={() => void run(p.id, false)}>{t("رفع الحظر")}</Button>
    </div>)}
  </section>;
}