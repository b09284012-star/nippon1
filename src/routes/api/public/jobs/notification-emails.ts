import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

export const Route = createFileRoute("/api/public/jobs/notification-emails")({
  staticData: { sitemap: false },
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authFailure = await authenticateCronRequest(request);
        if (authFailure) return authFailure;
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
        const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        const { data: pending } = await supabaseAdmin.from("notifications").select("id")
          .is("emailed_at", null).gte("created_at", since).order("created_at").limit(40);
        const ids = (pending ?? []).map((n) => n.id);
        if (!ids.length) return Response.json({ sent: 0 });
        // Claim first so overlapping runs never email the same notification twice.
        const { data: claimed } = await supabaseAdmin.from("notifications")
          .update({ emailed_at: new Date().toISOString() }).in("id", ids).is("emailed_at", null)
          .select("id, user_id, title, body, link");
        let sent = 0;
        for (const n of claimed ?? []) {
          try {
            const { data } = await supabaseAdmin.auth.admin.getUserById(n.user_id);
            const email = data.user?.email;
            if (!email) continue;
            const path = n.link && n.link.startsWith("/") ? n.link : "/notifications";
            const r = await sendTemplateEmail("new-notification", email, {
              templateData: { title: n.title, body: n.body, url: `https://nipponminers.com${path}` },
              idempotencyKey: `notification-${n.id}`,
            });
            if (r.sent) sent++;
          } catch (e) { console.error("notification email failed", n.id, e); }
        }
        return Response.json({ sent });
      },
    },
  },
});
