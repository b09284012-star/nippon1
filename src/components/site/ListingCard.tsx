import { Link } from "@tanstack/react-router";
import { Cpu, ShieldCheck, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { FALLBACK_IMAGE, formatUsd, useStorageUrl } from "@/lib/media";

export type ListingRow = {
  id: string;
  title: string;
  brand: string;
  model: string;
  hashrate: string;
  power_watts: number;
  condition: string;
  price_usd: number | string;
  warranty_months: number;
  location: string | null;
  images: string[];
  status: string;
};

export function ListingCard({ listing }: { listing: ListingRow }) {
  const { data: url } = useStorageUrl("listing-images", listing.images?.[0]);

  return (
    <Link
      to="/listings/$id"
      params={{ id: listing.id }}
      className="group card-3d card-3d-hover glass block overflow-hidden rounded-2xl"
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        <img
          src={url ?? FALLBACK_IMAGE}
          alt={listing.title}
          loading="lazy"
          className="size-full object-cover transition-transform duration-700 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-transparent" />
        <div className="absolute bottom-3 start-3 flex gap-2">
          <Badge className="bg-primary/90 text-primary-foreground">{listing.condition}</Badge>
          {listing.status === "sold" && <Badge variant="destructive">تم البيع</Badge>}
        </div>
      </div>
      <div className="space-y-3 p-4">
        <h3 className="line-clamp-1 font-display text-lg font-bold">{listing.title}</h3>
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Cpu className="size-3.5 text-primary" /> {listing.hashrate}
          </span>
          <span className="inline-flex items-center gap-1">
            <Zap className="size-3.5 text-warning" /> {listing.power_watts} واط
          </span>
          <span className="inline-flex items-center gap-1">
            <ShieldCheck className="size-3.5 text-success" /> ضمان {listing.warranty_months} شهر
          </span>
        </div>
        <div className="flex items-center justify-between pt-1">
          <span className="font-display text-xl font-black neon-text">
            {formatUsd(listing.price_usd)}
          </span>
          <span className="text-xs text-muted-foreground">{listing.location ?? "—"}</span>
        </div>
      </div>
    </Link>
  );
}
