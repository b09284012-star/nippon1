import { t, useLanguage, numberLocale } from "@/lib/i18n";
import { useStorageUrl } from "@/lib/media";

export function ChatAttachment({ path, name, type }: { path: string; name?: string | null; type?: string | null }) {
  useLanguage();
  const { data: url } = useStorageUrl("chat-files", path);
  if (!url) return <p className="text-xs opacity-70">{t("جارٍ تحميل المرفق…")}</p>;
  if (type?.startsWith("image/")) {
    return (
      <a href={url} target="_blank" rel="noreferrer">
        <img src={url} alt={name ?? "صورة"} className="mb-1 max-h-64 rounded-xl object-cover" />
      </a>
    );
  }
  return (
    <a href={url} target="_blank" rel="noreferrer" download={name ?? undefined} className="mb-1 block underline">
      📎 {name ?? "ملف"}
    </a>
  );
}
