import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import heroMiner from "@/assets/hero-miner.jpg";

export const FALLBACK_IMAGE = heroMiner;

export function useStorageUrl(bucket: string, path?: string | null) {
  return useQuery({
    queryKey: ["storage-url", bucket, path],
    enabled: Boolean(path),
    staleTime: 1000 * 60 * 30,
    queryFn: async () => {
      const { data } = await supabase.storage.from(bucket).createSignedUrl(path as string, 3600);
      return data?.signedUrl ?? null;
    },
  });
}

export function formatUsd(value: number | string) {
  const n = typeof value === "string" ? Number(value) : value;
  return new Intl.NumberFormat("ar", { maximumFractionDigits: 2 }).format(n) + " USDT";
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("ar", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(value),
  );
}
