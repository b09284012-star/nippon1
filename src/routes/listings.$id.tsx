import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Cpu, Zap, ShieldCheck, Clock, MapPin, Star, MessagesSquare, Minus, Plus, Boxes, BadgeCheck, Pencil, Trash2 } from "lucide-react";
import { useIsOnline } from "@/lib/presence";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
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
  const { user, isAdmin } = useAuth();
  const [editOpen, setEditOpen] = useState(false);
  const [address, setAddress] = useState("");
  const [buying, setBuying] = useState(false);
  const [qty, setQty] = useState(1);
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
        .select("id, display_name, avatar_url, bio, country, rating, sales_count, is_verified_seller")
        .eq("id", listing!.seller_id)
        .maybeSingle();
      return data;
    },
  });

  const { data: imageUrl } = useStorageUrl("listing-images", listing?.images?.[0]);

  const startChat = async () => {
    if (!user) { navigate({ to: "/auth" }); return; }
    if (!listing) return;
    if (listing.seller_id === user.id) { toast.error("هذا عرضك الخاص"); return; }
    const { data: existing } = await supabase
      .from("conversations")
      .select("id")
      .eq("listing_id", listing.id)
      .eq("buyer_id", user.id)
      .maybeSingle();
    if (existing) { navigate({ to: "/chat/$id", params: { id: existing.id } }); return; }
    const { data, error } = await supabase
      .from("conversations")
      .insert({ listing_id: listing.id, buyer_id: user.id, seller_id: listing.seller_id })
      .select("id")
      .single();
    if (error) { toast.error(error.message); return; }
    navigate({ to: "/chat/$id", params: { id: data.id } });
  };

  const buy = async () => {
    if (!user) { navigate({ to: "/auth" }); return; }
    if (address.trim().length < 10) { toast.error("أدخل عنوان شحن صحيح"); return; }
    setBuying(true);
    const { error } = await supabase.rpc("create_escrow_order", {
      _listing_id: id,
      _shipping_address: address.trim(),
      _quantity: qty,
    });
    setBuying(false);
    if (error) { toast.error(error.message); return; }
    setOpen(false);
    toast.success("تم حجز المبلغ في الضمان", { description: "تابع الطلب من صفحة طلباتي" });
    void refetch();
    navigate({ to: "/orders" });
  };

  if (!listing) return <div className="mx-auto max-w-7xl px-4 py-20">جاري التحميل…</div>;

  const isOwner = user?.id === listing.seller_id || isAdmin;

  const removeListing = async () => {
    if (!confirm("حذف هذا المنشور نهائيًا؟")) return;
    const { error } = await supabase.from("listings").delete().eq("id", listing.id);
    if (error) {
      const { error: e2 } = await supabase.from("listings").update({ status: "paused" }).eq("id", listing.id);
      if (e2) { toast.error(e2.message); return; }
      toast.success("المنشور مرتبط بطلبات سابقة، تم إخفاؤه من السوق");
    } else toast.success("تم حذف المنشور");
    await queryClient.invalidateQueries({ queryKey: ["listings"] });
    await queryClient.invalidateQueries({ queryKey: ["latest-listings"] });
    navigate({ to: "/market" });
  };

  const onOrder = listing.availability === "on_order";
  const maxQty = onOrder ? 0 : (listing.quantity ?? 1);

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
            <Spec
              icon={Boxes}
              label="التوفر"
              value={onOrder ? "حسب الطلب" : `متوفر: ${maxQty} قطعة`}
            />
          </div>

          <div className="glass mt-6 rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground">البائع</div>
                <div className="flex items-center gap-2 font-bold">
                  {seller?.display_name ?? "—"}
                  {seller?.is_verified_seller && (
                    <Badge className="gap-1"><BadgeCheck className="size-3.5" /> بائع معتمد</Badge>
                  )}
                </div>
                <OnlineStatus userId={listing.seller_id} />
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

          {isOwner && (
            <div className="mt-6 flex flex-wrap gap-3">
              <Button variant="outline" onClick={() => setEditOpen(true)}>
                <Pencil className="size-4" /> تعديل المنشور
              </Button>
              <Button variant="destructive" onClick={() => void removeListing()}>
                <Trash2 className="size-4" /> حذف المنشور
              </Button>
              <EditListingDialog
                open={editOpen}
                onOpenChange={setEditOpen}
                listing={listing}
                onSaved={() => void refetch()}
              />
            </div>
          )}

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
                    سيُخصم {formatUsd(listing.price_usd * qty)} من محفظتك ويُحجز في نيبون. لن يستلمه
                    البائع إلا بعد تأكيدك استلام الجهاز.
                  </DialogDescription>
                </DialogHeader>
                <div>
                  <Label className="mb-2 block">الكمية</Label>
                  <div className="flex items-center gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setQty((q) => Math.max(1, q - 1))}
                    >
                      <Minus className="size-4" />
                    </Button>
                    <Input
                      type="number"
                      min={1}
                      {...(maxQty ? { max: maxQty } : {})}
                      value={qty}
                      onChange={(e) => {
                        const v = Math.max(1, Number(e.target.value) || 1);
                        setQty(maxQty ? Math.min(v, maxQty) : v);
                      }}
                      className="w-24 text-center"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setQty((q) => (maxQty ? Math.min(maxQty, q + 1) : q + 1))}
                    >
                      <Plus className="size-4" />
                    </Button>
                    <span className="text-xs text-muted-foreground">
                      {maxQty ? `المتوفر: ${maxQty}` : "حسب الطلب"}
                    </span>
                  </div>
                  <div className="mt-3 text-sm">
                    الإجمالي:{" "}
                    <span className="font-display font-black">
                      {formatUsd(listing.price_usd * qty)}
                    </span>
                  </div>
                </div>
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

function OnlineStatus({ userId }: { userId: string }) {
  const online = useIsOnline(userId);
  return (
    <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
      <span className={online ? "size-2 rounded-full bg-primary" : "size-2 rounded-full bg-muted-foreground/50"} />
      {online ? "متصل الآن" : "غير متصل"}
    </div>
  );
}

type EditableListing = {
  id: string;
  title: string;
  price_usd: number;
  warranty_months: number;
  quantity: number;
  description: string;
  condition: string;
  status: "active" | "sold" | "paused";
};

function EditListingDialog({
  open,
  onOpenChange,
  listing,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  listing: EditableListing;
  onSaved: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const title = String(fd.get("title") ?? "").trim();
    const price = Number(fd.get("price_usd"));
    const warranty = Number(fd.get("warranty_months"));
    const quantity = Number(fd.get("quantity"));
    const description = String(fd.get("description") ?? "").trim();
    const condition = String(fd.get("condition") ?? "").trim();
    const status = String(fd.get("status")) as EditableListing["status"];
    if (title.length < 6 || !(price > 0) || warranty < 0 || quantity < 0 || description.length < 20) {
      toast.error("تحقق من الحقول (العنوان 6 أحرف، الوصف 20 حرفًا، السعر أكبر من صفر)");
      return;
    }
    setBusy(true);
    const { error } = await supabase
      .from("listings")
      .update({ title, price_usd: price, warranty_months: warranty, quantity, description, condition, status })
      .eq("id", listing.id);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("تم حفظ التعديلات");
    onOpenChange(false);
    onSaved();
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>تعديل المنشور</DialogTitle>
          <DialogDescription>عدّل السعر أو الكمية أو الوصف ثم احفظ.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="grid gap-3">
          <div><Label className="mb-1 block">العنوان</Label><Input name="title" defaultValue={listing.title} /></div>
          <div className="grid grid-cols-3 gap-3">
            <div><Label className="mb-1 block">السعر</Label><Input name="price_usd" type="number" step="0.01" defaultValue={listing.price_usd} /></div>
            <div><Label className="mb-1 block">الضمان (شهر)</Label><Input name="warranty_months" type="number" defaultValue={listing.warranty_months} /></div>
            <div><Label className="mb-1 block">الكمية</Label><Input name="quantity" type="number" defaultValue={listing.quantity} /></div>
          </div>
          <div><Label className="mb-1 block">الحالة</Label><Input name="condition" defaultValue={listing.condition} /></div>
          <div>
            <Label className="mb-1 block">حالة العرض</Label>
            <select name="status" defaultValue={listing.status} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
              <option value="active">معروض</option>
              <option value="paused">مخفي مؤقتًا</option>
              <option value="sold">تم البيع</option>
            </select>
          </div>
          <div><Label className="mb-1 block">الوصف</Label><Textarea name="description" defaultValue={listing.description} /></div>
          <DialogFooter>
            <Button type="submit" disabled={busy}>{busy ? "جارٍ الحفظ…" : "حفظ"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
