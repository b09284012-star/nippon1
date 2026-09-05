import { useAuth } from "@/lib/auth";
import { usePresenceTracker } from "@/lib/presence";

/** Invisible component that reports the current visitor as online. */
export function PresenceTracker() {
  const { user } = useAuth();
  usePresenceTracker(user?.id ?? null);
  return null;
}
