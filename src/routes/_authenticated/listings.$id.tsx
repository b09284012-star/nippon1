import { t, useLanguage, numberLocale } from "@/lib/i18n";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Cpu, Zap, ShieldCheck, Clock, MapPin, MessagesSquare, Minus, Plus, Boxes, Pencil, Trash2, Star } from "lucide-react";
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

export const Route = createFileRoute("/_authenticated/listings/$id")({
  head: () => ({
    meta: [
      { title: t("تفاصيل الجهاز | Nippon") },
      {
        name: "description",
        content: t("مواصفات الجهاز، السعر، مدة الضمان، وبيانات البائع مع شراء محمي بنظام الضمان."),
      },
      { property: "og:title", content: t("تفاصيل الجهاز | Nippon") },
      { property: "og:description", content: t("شراء أجهزة تعدين مستعملة بحماية المشتري على نيبون.") },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ListingDetail,
});

function ListingDetail() {
  useLanguage();
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
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
      if (!listing?.seller_id) return null;
      const { data, error } = await supabase.rpc("public_profile_names", { _ids: [listing.seller_id] });
      if (error) throw error;
      return data?.[0] ?? null;
    },
  });

  const { data: imageUrl } = useStorageUrl("listing-images", listing?.images?.[0]);

  const { data: reviews } = useQuery({
    queryKey: ["seller-reviews", listing?.seller_id],
    enabled: Boolean(listing?.seller_id),
    queryFn: async () => {
      const { data } = await supabase
        .from("reviews")
        .select("id, rating, comment, created_at, reviewer_id")
        .eq("seller_id", listing!.seller_id)
        .order("created_at", { ascending: false })
        .limit(20);
      return data ?? [];
    },
  });

  const { data: reviewerNames } = useQuery({
    queryKey: ["reviewer-names", (reviews ?? []).map((r) => r.reviewer_id).join(",")],
    enabled: (reviews ?? []).length > 0,
    queryFn: async () => {
      const ids = [...new Set((reviews ?? []).map((r) => r.reviewer_id))];
      const { data } = await supabase.rpc("public_profile_names", { _ids: ids });
      return new Map((data ?? []).map((p) => [p.id, p.display_name]));
    },
  });

  const avgRating =
    reviews && reviews.length > 0
      ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
      : null;

  const startChat = async () => {
    if (!user) { navigate({ to: "/auth" }); return; }
    if (!listing) return;
    if (listing.seller_id === user.id) { toast.error(t("هذا عرضك الخاص")); return; }
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
    if (address.trim().length < 10) { toast.error(t("أدخل عنوان شحن صحيح")); return; }
    setBuying(true);
    const { error } = await supabase.rpc("create_escrow_order", {
      _listing_id: id,
      _shipping_address: address.trim(),
      _quantity: qty,
    });
    setBuying(false);
    if (error) { toast.error(error.message); return; }
    setOpen(false);
    toast.success(t("تم حجز المبلغ في الضمان"), { description: t("تابع الطلب من صفحة طلباتي") });
    void refetch();
    navigate({ to: "/orders" });
  };

  if (!listing) return <div className="mx-auto max-w-7xl px-4 py-20">{t("جاري التحميل…")}</div>;

  const isOwner = user?.id === listing.seller_id || isAdmin;

  const removeListing = async () => {
    if (!confirm(t("حذف هذا المنشور نهائيًا؟"))) return;
    const { error } = await supabase.from("listings").delete().eq("id", listing.id);
    if (error) {
      const { error: e2 } = await supabase.from("listings").update({ status: "paused" }).eq("id", listing.id);
      if (e2) { toast.error(e2.message); return; }
      toast.success(t("المنشور مرتبط بطلبات سابقة، تم إخفاؤه من السوق"));
    } else toast.success(t("تم حذف المنشور"));
    await queryClient.invalidateQueries({ queryKey: ["listings"] });
    await queryClient.invalidateQueries({ queryKey: ["latest-listings"] });
    await queryClient.invalidateQueries({ queryKey: ["company-listings"] });
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
            {listing.status === "sold" && <Badge variant="destructive">{t("تم البيع")}</Badge>}
          </div>
          <h1 className="mt-4 font-display text-3xl font-black">{listing.title}</h1>
          <div className="mt-4 font-display text-4xl font-black neon-text">
            {formatUsd(listing.price_usd)}
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
            <Spec icon={Cpu} label={t("الهاش ريت")} value={listing.hashrate} />
            <Spec icon={Zap} label={t("الاستهلاك")} value={`${listing.power_watts} واط`} />
            <Spec
              icon={ShieldCheck}
              label={t("الضمان")}
              value={`${listing.warranty_months} شهر`}
            />
            <Spec
              icon={Clock}
              label={t("ساعات التشغيل")}
              value={listing.hours_used ? `${listing.hours_used} ساعة` : t("غير محدد")}
            />
            <Spec icon={MapPin} label={t("الموقع")} value={listing.location ?? "—"} />
            <Spec icon={Cpu} label={t("الخوارزمية")} value={listing.algorithm ?? "—"} />
            <Spec
              icon={Boxes}
              label={t("التوفر")}
              value={onOrder ? t("حسب الطلب") : `متوفر: ${maxQty} قطعة`}
            />
          </div>

          <div className="glass mt-6 rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground">{t("البائع")}</div>
                <div className="flex items-center gap-2 font-bold">
                  {seller?.display_name ?? "—"}
                </div>
                {avgRating !== null && (
                  <div className="mt-1 flex items-center gap-1.5 text-sm">
                    <Star className="size-4 fill-primary text-primary" />
                    <span className="font-bold">{avgRating.toFixed(1)}</span>
                    <span className="text-xs text-muted-foreground">
                      ({reviews?.length} {t("تقييم)")} </span>
                  </div>
                )}
                <OnlineStatus userId={listing.seller_id} />
              </div>
            </div>
          </div>

          {isOwner && (
            <div className="mt-6 flex flex-wrap gap-3">
              <Button variant="outline" onClick={() => setEditOpen(true)}>
                <Pencil className="size-4" /> {t("تعديل المنشور")} </Button>
              <Button variant="destructive" onClick={() => void removeListing()}>
                <Trash2 className="size-4" /> {t("حذف المنشور")} </Button>
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
                  <ShieldCheck className="size-4" /> {t("شراء بحماية المشتري")} </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t("تأكيد الشراء عبر الضمان")}</DialogTitle>
                  <DialogDescription>
                    {t("سيُخصم")} {formatUsd(listing.price_usd * qty)} {t("من محفظتك ويُحجز في نيبون. لن يستلمه البائع إلا بعد تأكيدك استلام الجهاز.")} </DialogDescription>
                </DialogHeader>
                <div>
                  <Label className="mb-2 block">{t("الكمية")}</Label>
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
                      {maxQty ? `المتوفر: ${maxQty}` : t("حسب الطلب")}
                    </span>
                  </div>
                  <div className="mt-3 text-sm">
                    {t("الإجمالي:")}{" "}
                    <span className="font-display font-black">
                      {formatUsd(listing.price_usd * qty)}
                    </span>
                  </div>
                </div>
                <div>
                  <Label className="mb-2 block">{t("عنوان الشحن")}</Label>
                  <Textarea
                    value={address}
                    onChange={(e) => setAddress(e.target.value.slice(0, 400))}
                    placeholder={t("المدينة، الحي، الشارع، رقم الهاتف")}
                  />
                </div>
                <DialogFooter>
                  <Button onClick={() => void buy()} disabled={buying}>
                    {buying ? t("جاري التنفيذ…") : t("تأكيد وحجز المبلغ")}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Button size="lg" variant="outline" onClick={() => void startChat()}>
              <MessagesSquare className="size-4" /> {t("دردشة مع البائع")} </Button>
          </div>
        </div>
      </div>

      <div className="glass mt-10 rounded-2xl p-6">
        <h2 className="font-display text-xl font-bold">{t("الوصف")}</h2>
        <p className="mt-3 whitespace-pre-line text-muted-foreground">{listing.description}</p>
      </div>

      <div className="glass mt-6 rounded-2xl p-6">
        <h2 className="font-display text-xl font-bold">{t("تقييمات البائع")}</h2>
        {(reviews ?? []).length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">{t("لا توجد تقييمات بعد لهذا البائع.")}</p>
        ) : (
          <div className="mt-4 grid gap-3">
            {(reviews ?? []).map((r) => (
              <div key={r.id} className="rounded-xl border border-border/50 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-bold">
                    {reviewerNames?.get(r.reviewer_id) ?? "مشتري"}
                  </span>
                  <span className="inline-flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star
                        key={n}
                        className={
                          n <= r.rating
                            ? "size-4 fill-primary text-primary"
                            : "size-4 text-muted-foreground/40"
                        }
                      />
                    ))}
                  </span>
                  <span className="ms-auto text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleDateString(numberLocale())}
                  </span>
                </div>
                {r.comment && (
                  <p className="mt-2 text-sm text-muted-foreground">{r.comment}</p>
                )}
              </div>
            ))}
          </div>
        )}
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
  useLanguage();
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
  useLanguage();
  const online = useIsOnline(userId);
  return (
    <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
      <span className={online ? "size-2 rounded-full bg-primary" : "size-2 rounded-full bg-muted-foreground/50"} />
      {online ? t("متصل الآن") : t("غير متصل")}
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
  useLanguage();
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
      toast.error(t("تحقق من الحقول (العنوان 6 أحرف، الوصف 20 حرفًا، السعر أكبر من صفر)"));
      return;
    }
    setBusy(true);
    const { error } = await supabase
      .from("listings")
      .update({ title, price_usd: price, warranty_months: warranty, quantity, description, condition, status })
      .eq("id", listing.id);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(t("تم حفظ التعديلات"));
    onOpenChange(false);
    onSaved();
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("تعديل المنشور")}</DialogTitle>
          <DialogDescription>{t("عدّل السعر أو الكمية أو الوصف ثم احفظ.")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="grid gap-3">
          <div><Label className="mb-1 block">{t("العنوان")}</Label><Input name="title" defaultValue={listing.title} /></div>
          <div className="grid grid-cols-3 gap-3">
            <div><Label className="mb-1 block">{t("السعر")}</Label><Input name="price_usd" type="number" step="0.01" defaultValue={listing.price_usd} /></div>
            <div><Label className="mb-1 block">{t("الضمان (شهر)")}</Label><Input name="warranty_months" type="number" defaultValue={listing.warranty_months} /></div>
            <div><Label className="mb-1 block">{t("الكمية")}</Label><Input name="quantity" type="number" defaultValue={listing.quantity} /></div>
          </div>
          <div><Label className="mb-1 block">{t("الحالة")}</Label><Input name="condition" defaultValue={listing.condition} /></div>
          <div>
            <Label className="mb-1 block">{t("حالة العرض")}</Label>
            <select name="status" defaultValue={listing.status} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
              <option value="active">{t("معروض")}</option>
              <option value="paused">{t("مخفي مؤقتًا")}</option>
              <option value="sold">{t("تم البيع")}</option>
            </select>
          </div>
          <div><Label className="mb-1 block">{t("الوصف")}</Label><Textarea name="description" defaultValue={listing.description} /></div>
          <DialogFooter>
            <Button type="submit" disabled={busy}>{busy ? t("جارٍ الحفظ…") : t("حفظ")}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
