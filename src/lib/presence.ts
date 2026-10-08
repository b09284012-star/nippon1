import { useEffect, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

const CHANNEL = "online-users";

type Listener = (count: number, keys: Set<string>) => void;

let channel: RealtimeChannel | null = null;
let refs = 0;
let subscribed = false;
const listeners = new Set<Listener>();
let payload: Record<string, unknown> = {};

function emit() {
  if (!channel) return;
  const keys = new Set(Object.keys(channel.presenceState()));
  listeners.forEach((l) => l(keys.size, keys));
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

/** Whether a specific user is currently online (Instagram-style indicator). */
export function useIsOnline(userId: string | null | undefined) {
  const [online, setOnline] = useState(false);
  useEffect(() => {
    if (!userId) return;
    acquire(`watch-${Math.random().toString(36).slice(2, 10)}`);
    const listener: Listener = (_n, keys) => setOnline(keys.has(userId));
    listeners.add(listener);
    emit();
    return () => {
      listeners.delete(listener);
      release();
    };
  }, [userId]);
  return online;
}
