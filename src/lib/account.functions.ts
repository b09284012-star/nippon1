import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const deleteMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: w } = await supabaseAdmin.from("wallets").select("balance, held").eq("user_id", context.userId).maybeSingle();
    if (w && (Number(w.held) > 0)) throw new Error("لا يمكن حذف الحساب وهناك مبالغ محجوزة في الضمان");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminAccountAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string; action: "ban" | "suspend" | "unban" | "delete"; days?: number }) => {
    if (!/^[0-9a-f-]{36}$/i.test(input.userId)) throw new Error("bad id");
    if (!["ban", "suspend", "unban", "delete"].includes(input.action)) throw new Error("bad action");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("FORBIDDEN");
    if (data.userId === context.userId) throw new Error("لا يمكنك تنفيذ هذا على حسابك");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.action === "delete") {
      const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
      if (error) throw new Error(error.message);
      return { ok: true };
    }
    const days = Math.min(Math.max(Math.floor(data.days ?? 7), 1), 365);
    const ban_duration = data.action === "ban" ? "876000h" : data.action === "suspend" ? `${days * 24}h` : "none";
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, { ban_duration });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminListBans = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("FORBIDDEN");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    if (error) throw new Error(error.message);
    const out: Record<string, string> = {};
    for (const u of data.users) {
      const b = (u as { banned_until?: string | null }).banned_until;
      if (b && new Date(b) > new Date()) out[u.id] = b;
    }
    return out;
  });
