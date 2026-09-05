import { useEffect, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

const CHANNEL = "online-users";

type Listener = (count: number) => void;

let channel: RealtimeChannel | null = null;
let refs = 0;
let subscribed = false;
const listeners = new Set<Listener>();
let payload: Record<string, unknown> = {};

function emit() {
  if (!channel) return;
  const count = Object.keys(channel.presenceState()).length;
  listeners.forEach((l) => l(count));
}

/** Creates (once) the shared presence channel with all handlers before subscribe. */
function acquire(key: string) {
  refs += 1;
  if (!channel) {
    subscribed = false;
    channel = supabase.channel(CHANNEL, { config: { presence: { key } } });
    channel
      .on("presence", { event: "sync" }, emit)
      .on("presence", { event: "join" }, emit)
      .on("presence", { event: "leave" }, emit)
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          subscribed = true;
          if (Object.keys(payload).length > 0) void channel?.track(payload);
          emit();
        }
      });
  }
  return channel;
}

function release() {
  refs -= 1;
  if (refs <= 0 && channel) {
    const c = channel;
    channel = null;
    subscribed = false;
    refs = 0;
    void supabase.removeChannel(c);
  }
}

/** Announces the current visitor as online for the lifetime of the page. */
export function usePresenceTracker(userId: string | null) {
  useEffect(() => {
    const key = userId ?? `guest-${Math.random().toString(36).slice(2, 10)}`;
    const c = acquire(key);
    payload = { online_at: new Date().toISOString(), guest: !userId };
    if (subscribed) void c.track(payload);
    return () => {
      payload = {};
      release();
    };
  }, [userId]);
}

/** Live count of visitors currently on the site. */
export function useOnlineCount(enabled: boolean) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    acquire(`watch-${Math.random().toString(36).slice(2, 10)}`);
    const listener: Listener = (n) => setCount(n);
    listeners.add(listener);
    emit();
    return () => {
      listeners.delete(listener);
      release();
    };
  }, [enabled]);

  return count;
}
