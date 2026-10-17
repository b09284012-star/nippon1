import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

const KEY = "nippon-country";

/** The country whose market the visitor sees: account country when signed in, else a saved choice. */
export function useMyCountry() {
  const { user } = useAuth();
  const [guest, setGuestState] = useState<string>("");
  useEffect(() => {
    setGuestState(localStorage.getItem(KEY) ?? "");
  }, []);
  const setGuest = (c: string) => {
    localStorage.setItem(KEY, c);
    setGuestState(c);
  };
  const acc = useQuery({
    queryKey: ["my-country", user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return "";
      const { data } = await supabase
        .from("user_private_info")
        .select("country")
        .eq("user_id", user.id)
        .maybeSingle();
      return ((data as { country?: string } | null)?.country ?? "").trim();
    },
  });
  const accountCountry = acc.data ?? "";
  const country = user && accountCountry ? accountCountry : guest;
  return { country, isAccount: !!(user && accountCountry), setGuest, loading: !!user && acc.isLoading };
}
