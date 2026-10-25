import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const forumMembers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [{ data: manager }, { data: forum }] = await Promise.all([
      context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" }),
      context.supabase.rpc("has_staff", { _user_id: context.userId, _responsibility: "forum" }),
    ]);
    if (!manager && !forum) throw new Error("FORBIDDEN");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.from("profiles").select("id,display_name").order("display_name");
    if (error) throw new Error(error.message);
    return data;
  });

export const moderateForumAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string; banned: boolean }) => {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.userId) || typeof input.banned !== "boolean") throw new Error("INVALID_INPUT");
    return input;
  })
  .handler(async ({ data, context }) => {
    const [{ data: manager }, { data: forum }] = await Promise.all([
      context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" }),
      context.supabase.rpc("has_staff", { _user_id: context.userId, _responsibility: "forum" }),
    ]);
    if (!manager && !forum) throw new Error("FORBIDDEN");
    if (data.userId === context.userId) throw new Error("لا يمكنك تنفيذ هذا على حسابك");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: roles }, { data: staff }] = await Promise.all([
      supabaseAdmin.from("user_roles").select("role").eq("user_id", data.userId),
      supabaseAdmin.from("staff_assignments").select("responsibility").eq("user_id", data.userId),
    ]);
    if (!manager && (roles?.some(r => r.role === "admin") || staff?.length)) throw new Error("حساب الإدارة محمي؛ راجع المدير");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, { ban_duration: data.banned ? "876000h" : "none" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });