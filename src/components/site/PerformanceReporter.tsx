import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { submitPerformanceSample } from "@/lib/performance.functions";
import { recordCacheResult, takePerformanceSample } from "@/lib/performance-monitoring";

export function PerformanceReporter() {
  const client = useQueryClient();
  const submit = useServerFn(submitPerformanceSample);
  useEffect(() => {
    const session = crypto.randomUUID();
    const unsubscribe = client.getQueryCache().subscribe(event => {
      if (event.type !== "observerAdded" || !["listings", "latest-listings"].includes(String(event.query.queryKey[0]))) return;
      recordCacheResult(!event.query.isStaleByTime(120000));
    });
    let busy = false;
    const report = async () => {
      if (busy || document.visibilityState !== "visible") return;
      busy = true;
      // One multiplexed WebSocket per browser tab, regardless of channel count.
      const sample = takePerformanceSample(supabase.realtime.isConnected() ? 1 : 0);
      try { await submit({ data: { session, ...sample } }); } catch { /* Monitoring never interrupts the visit. */ }
      finally { busy = false; }
    };
    const timer = window.setInterval(() => void report(), 60000);
    return () => { window.clearInterval(timer); unsubscribe(); };
  }, [client, submit]);
  return null;
}