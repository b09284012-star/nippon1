import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const CHANNEL = "online-users";

/** Announces the current visitor as online for the lifetime of the page. */
export function usePresenceTracker(userId: string | null) {
  useEffect(() => {
    const key = userId ?? `guest-${Math.random().toString(36).slice(2, 10)}`;
    const channel = supabase.channel(CHANNEL, { config: { presence: { key } } });
    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        void channel.track({ online_at: new Date().toISOString(), guest: !userId });
      }
    });
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId]);
}

/** Live count of visitors currently on the site. */
export function useOnlineCount(enabled: boolean) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    const channel = supabase.channel(CHANNEL, { config: { presence: { key: `watch-${Date.now()}` } } });
    const sync = () => setCount(Object.keys(channel.presenceState()).length);
    channel
      .on("presence", { event: "sync" }, sync)
      .on("presence", { event: "join" }, sync)
      .on("presence", { event: "leave" }, sync)
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [enabled]);

  return count;
}
