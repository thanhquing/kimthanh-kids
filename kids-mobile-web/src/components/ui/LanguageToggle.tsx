import { useT } from "@/i18n";
import { languageStore, type Language } from "@/lib/language";
import { cn } from "@/lib/utils";

/** Segmented VI/EN — dùng ở các màn trước đăng nhập (login/reset) nơi chưa có ProfilePage. */
export function LanguageToggle({ className }: { className?: string }) {
  const { lang } = useT();
  const langs: { code: Language; label: string }[] = [
    { code: "vi", label: "VI" },
    { code: "en", label: "EN" },
  ];

  return (
    <div className={cn("inline-flex rounded-full bg-slate-100 p-0.5 text-xs font-semibold", className)}>
      {langs.map((item) => (
        <button
          key={item.code}
          type="button"
          onClick={() => languageStore.set(item.code)}
          className={cn(
            "rounded-full px-3 py-1 transition",
            lang === item.code ? "bg-white text-slate-800 shadow-sm" : "text-slate-400",
          )}
          aria-pressed={lang === item.code}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
