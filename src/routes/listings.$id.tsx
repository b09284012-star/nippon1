import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Cpu, Zap, ShieldCheck, Clock, MapPin, Star, MessagesSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { FALLBACK_IMAGE, formatUsd, useStorageUrl } from "@/lib/media";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/listings/$id")({
  head: () => ({
    meta: [
      { title: "تفاصيل الجهاز | Nippon" },
      {
        name: "description",
        content: "مواصفات الجهاز، السعر، مدة الضمان، وبيانات البائع مع شراء محمي بنظام الضمان.",
      },
      { property: "og:title", content: "تفاصيل الجهاز | Nippon" },
      { property: "og:description", content: "شراء أجهزة تعدين مستعملة بحماية المشتري على نيبون." },
    ],
  }),
  component: ListingDetail,
});

function ListingDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [address, setAddress] = useState("");
  const [buying, setBuying] = useState(false);
  const [open, setOpen] = useState(false);

  const { data: listing, refetch } = useQuery({
    queryKey: ["listing", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("listings").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: seller } = useQuery({
    queryKey: ["seller", listing?.seller_id],
    enabled: Boolean(listing?.seller_id),
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", listing!.seller_id)
        .maybeSingle();
      return data;
    },
  });

  const { data: imageUrl } = useStorageUrl("listing-images", listing?.images?.[0]);

  const startChat = async () => {
    if (!user) return navigate({ to: "/auth" });
    if (!listing) return;
    if (listing.seller_id === user.id) return toast.error("هذا عرضك الخاص");
    const { data: existing } = await supabase
      .from("conversations")
      .select("id")
      .eq("listing_id", listing.id)
      .eq("buyer_id", user.id)
      .maybeSingle();
    if (existing) return navigate({ to: "/chat/$id", params: { id: existing.id } });
    const { data, error } = await supabase
      .from("conversations")
      .insert({ listing_id: listing.id, buyer_id: user.id, seller_id: listing.seller_id })
      .select("id")
      .single();
    if (error) return toast.error(error.message);
    navigate({ to: "/chat/$id", params: { id: data.id } });
  };

  const buy = async () => {
    if (!user) return navigate({ to: "/auth" });
    if (profile?.kyc_status !== "approved")
      return toast.error("يجب توثيق هويتك قبل الشراء", { description: "افتح صفحة توثيق الهوية" });
    if (address.trim().length < 10) return toast.error("أدخل عنوان شحن صحيح");
    setBuying(true);
    const { error } = await supabase.rpc("create_escrow_order", {
      _listing_id: id,
      _shipping_address: address.trim(),
    });
    setBuying(false);
    if (error) return toast.error(error.message);
    setOpen(false);
    toast.success("تم حجز المبلغ في الضمان", { description: "تابع الطلب من صفحة طلباتي" });
    void refetch();
    navigate({ to: "/orders" });
  };

  if (!listing) return <div className="mx-auto max-w-7xl px-4 py-20">جاري التحميل…</div>;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr]">
        <div className="glass card-3d overflow-hidden rounded-3xl p-3">
          <img
            src={imageUrl ?? FALLBACK_IMAGE}
            alt={listing.title}
            className="aspect-[4/3] w-full rounded-2xl object-cover"
          />
        </div>

        <div>
          <div className="flex flex-wrap gap-2">
            <Badge>{listing.condition}</Badge>
            <Badge variant="secondary">{listing.brand}</Badge>
            {listing.status === "sold" && <Badge variant="destructive">تم البيع</Badge>}
          </div>
          <h1 className="mt-4 font-display text-3xl font-black">{listing.title}</h1>
          <div className="mt-4 font-display text-4xl font-black neon-text">
            {formatUsd(listing.price_usd)}
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
            <Spec icon={Cpu} label="الهاش ريت" value={listing.hashrate} />
            <Spec icon={Zap} label="الاستهلاك" value={`${listing.power_watts} واط`} />
            <Spec
              icon={ShieldCheck}
              label="الضمان"
              value={`${listing.warranty_months} شهر`}
            />
            <Spec
              icon={Clock}
              label="ساعات التشغيل"
              value={listing.hours_used ? `${listing.hours_used} ساعة` : "غير محدد"}
            />
            <Spec icon={MapPin} label="الموقع" value={listing.location ?? "—"} />
            <Spec icon={Cpu} label="الخوارزمية" value={listing.algorithm ?? "—"} />
          </div>

          <div className="glass mt-6 rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground">البائع</div>
                <div className="font-bold">{seller?.display_name ?? "—"}</div>
              </div>
              <div className="flex items-center gap-1 text-warning">
                <Star className="size-4 fill-current" />
                <span className="text-sm">{Number(seller?.rating ?? 0).toFixed(1)}</span>
                <span className="text-xs text-muted-foreground">
                  ({seller?.sales_count ?? 0} صفقة)
                </span>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="lg" disabled={listing.status !== "active"}>
                  <ShieldCheck className="size-4" /> شراء بحماية المشتري
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>تأكيد الشراء عبر الضمان</DialogTitle>
                  <DialogDescription>
                    سيُخصم {formatUsd(listing.price_usd)} من محفظتك ويُحجز في نيبون. لن يستلمه
                    البائع إلا بعد تأكيدك استلام الجهاز.
                  </DialogDescription>
                </DialogHeader>
                <div>
                  <Label className="mb-2 block">عنوان الشحن</Label>
                  <Textarea
                    value={address}
                    onChange={(e) => setAddress(e.target.value.slice(0, 400))}
                    placeholder="المدينة، الحي، الشارع، رقم الهاتف"
                  />
                </div>
                <DialogFooter>
                  <Button onClick={() => void buy()} disabled={buying}>
                    {buying ? "جاري التنفيذ…" : "تأكيد وحجز المبلغ"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Button size="lg" variant="outline" onClick={() => void startChat()}>
              <MessagesSquare className="size-4" /> دردشة مع البائع
            </Button>
          </div>
        </div>
      </div>

      <div className="glass mt-10 rounded-2xl p-6">
        <h2 className="font-display text-xl font-bold">الوصف</h2>
        <p className="mt-3 whitespace-pre-line text-muted-foreground">{listing.description}</p>
      </div>
    </div>
  );
}

function Spec({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="glass rounded-xl p-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className="size-3.5 text-primary" /> {label}
      </div>
      <div className="mt-1 font-bold">{value}</div>
    </div>
  );
}
