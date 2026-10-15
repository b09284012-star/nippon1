import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export type Company = {
  user_id: string;
  company_name: string;
  logo_path: string | null;
  contact_email: string;
  contact_phone: string;
  website: string;
  description: string;
};

export function useCompanies() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["company-directory", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase.rpc("company_directory");
      if (error) throw error;
      return data as Company[];
    },
  });
}

export function businessWebsite(value: string) {
  if (!value.trim()) return null;
  try {
    const url = new URL(value.includes("://") ? value : `https://${value}`);
    return ["https:", "http:"].includes(url.protocol) ? url.href : null;
  } catch { return null; }
}