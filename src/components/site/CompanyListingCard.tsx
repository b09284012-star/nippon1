import { Link } from "@tanstack/react-router";
import { ArrowLeft, Cpu, ShieldCheck, Zap, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { type ListingRow } from "@/components/site/ListingCard";
import { FALLBACK_IMAGE, formatUsd, useStorageUrl } from "@/lib/media";

export function CompanyListingCard({ listing }: { listing: ListingRow }) {
  const { data: image } = useStorageUrl("listing-images", listing.images?.[0]);
  return (
    <Link to="/listings/$id" params={{ id: listing.id }} className="group grid overflow-hidden rounded-lg border border-border bg-card transition-colors hover:border-primary/60 sm:grid-cols-[220px_1fr]">
      <img src={image ?? FALLBACK_IMAGE} alt={listing.title} loading="lazy" className="aspect-[4/3] h-full max-h-60 w-full object-contain bg-muted" />
      <div className="flex min-w-0 flex-col gap-3 p-5">
        <div className="flex flex-wrap items-center gap-2"><Badge variant="secondary">عرض شركة</Badge><Badge variant="outline">{listing.condition}</Badge>{listing.location && <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="size-3.5" />{listing.location}</span>}</div>
        <h3 className="break-words font-display text-xl font-bold">{listing.title}</h3>
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1"><Cpu className="size-4 text-primary" />{listing.hashrate}</span>
          <span className="inline-flex items-center gap-1"><Zap className="size-4 text-warning" />{listing.power_watts} واط</span>
          <span className="inline-flex items-center gap-1"><ShieldCheck className="size-4 text-success" />ضمان {listing.warranty_months} شهر</span>
        </div>
        <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3"><strong className="text-xl text-primary">{formatUsd(listing.price_usd)}</strong><span className="inline-flex items-center gap-2 text-sm text-primary">تفاصيل العرض <ArrowLeft className="size-4" /></span></div>
      </div>
    </Link>
  );
}