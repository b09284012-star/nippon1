import { Building2, BadgeCheck, Mail, Phone, Globe } from "lucide-react";
import { type Company, businessWebsite } from "@/lib/companies";
import { useStorageUrl } from "@/lib/media";
import { Button } from "@/components/ui/button";

export function CompanyIdentity({ company }: { company: Company }) {
  const { data: logo } = useStorageUrl("company-logos", company.logo_path);
  const website = businessWebsite(company.website);
  return (
    <div className="flex flex-wrap items-start gap-4">
      <div className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-lg border border-border bg-muted">
        {logo ? <img src={logo} alt={`شعار ${company.company_name}`} className="size-full object-contain p-1" /> : <Building2 className="size-9 text-primary" />}
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="break-words font-display text-xl font-bold">{company.company_name}</h2>
          <span className="inline-flex items-center gap-1 text-xs text-success"><BadgeCheck className="size-4" /> شركة معتمدة</span>
        </div>
        {company.description && <p className="whitespace-pre-line break-words text-sm text-muted-foreground">{company.description}</p>}
        <div className="flex flex-wrap gap-2">
          {company.contact_phone && <Button asChild variant="outline" size="sm"><a href={`tel:${company.contact_phone.replace(/[^\d+]/g, "")}`}><Phone className="size-4" /><bdi className="break-all">{company.contact_phone}</bdi></a></Button>}
          {company.contact_email && <Button asChild variant="outline" size="sm" className="h-auto min-h-8 max-w-full"><a href={`mailto:${company.contact_email}`}><Mail className="size-4 shrink-0" /><bdi className="min-w-0 break-all whitespace-normal">{company.contact_email}</bdi></a></Button>}
          {website && <Button asChild variant="outline" size="sm"><a href={website} target="_blank" rel="noopener noreferrer"><Globe className="size-4" /> الموقع الإلكتروني</a></Button>}
        </div>
      </div>
    </div>
  );
}