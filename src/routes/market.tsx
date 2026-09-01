import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ListingCard, type ListingRow } from "@/components/site/ListingCard";

export const Route = createFileRoute("/market")({
  head: () => ({
    meta: [
      { title: "السوق | أجهزة تعدين مستعملة على Nippon" },
      {
        name: "description",
        content: "تصفح أجهزة التعدين المستعملة حسب النوع والهاش ريت والسعر والضمان على منصة نيبون.",
      },
      { property: "og:title", content: "السوق | أجهزة تعدين مستعملة على Nippon" },
      { property: "og:description", content: "فلترة الأجهزة حسب السعر والضمان والحالة والماركة." },
    ],
  }),
  component: Market,
});

function Market() {
  const [q, setQ] = useState("");
  const [brand, setBrand] = useState("all");
  const [condition, setCondition] = useState("all");
  const [maxPrice, setMaxPrice] = useState(8000);
  const [warranty, setWarranty] = useState("all");

  const { data, isLoading } = useQuery({
    queryKey: ["listings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("listings")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as ListingRow[];
    },
  });

  const brands = useMemo(
    () => Array.from(new Set((data ?? []).map((l) => l.brand))),
    [data],
  );

  const filtered = (data ?? []).filter((l) => {
    if (q && !`${l.title} ${l.brand} ${l.model}`.toLowerCase().includes(q.toLowerCase()))
      return false;
    if (brand !== "all" && l.brand !== brand) return false;
    if (condition !== "all" && l.condition !== condition) return false;
    if (Number(l.price_usd) > maxPrice) return false;
    if (warranty !== "all" && l.warranty_months < Number(warranty)) return false;
    return true;
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="font-display text-4xl font-black">السوق</h1>
      <p className="mt-2 text-muted-foreground">
        {isLoading ? "جاري التحميل…" : `${filtered.length} جهاز متاح`}
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[280px_1fr]">
        <aside className="glass h-fit space-y-6 rounded-2xl p-5">
          <div>
            <Label className="mb-2 block">بحث</Label>
            <div className="relative">
              <Search className="absolute top-2.5 start-3 size-4 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value.slice(0, 100))}
                placeholder="اسم الجهاز أو الموديل"
                className="ps-9"
              />
            </div>
          </div>
          <div>
            <Label className="mb-2 block">الماركة</Label>
            <Select value={brand} onValueChange={setBrand}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                {brands.map((b) => (
                  <SelectItem key={b} value={b}>
                    {b}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="mb-2 block">الحالة</Label>
            <Select value={condition} onValueChange={setCondition}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["all", "كالجديد", "ممتاز", "جيد جداً", "جيد", "مقبول"].map((c) => (
                  <SelectItem key={c} value={c}>
                    {c === "all" ? "الكل" : c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="mb-2 block">الحد الأقصى للسعر: {maxPrice} USDT</Label>
            <Slider
              value={[maxPrice]}
              min={100}
              max={8000}
              step={100}
              onValueChange={(v) => setMaxPrice(v[0] ?? 8000)}
            />
          </div>
          <div>
            <Label className="mb-2 block">أقل ضمان</Label>
            <Select value={warranty} onValueChange={setWarranty}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                <SelectItem value="1">شهر فأكثر</SelectItem>
                <SelectItem value="3">3 أشهر فأكثر</SelectItem>
                <SelectItem value="6">6 أشهر فأكثر</SelectItem>
                <SelectItem value="12">سنة فأكثر</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </aside>

        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((l) => (
            <ListingCard key={l.id} listing={l} />
          ))}
          {!isLoading && filtered.length === 0 && (
            <p className="text-muted-foreground">لا توجد نتائج مطابقة.</p>
          )}
        </div>
      </div>
    </div>
  );
}
