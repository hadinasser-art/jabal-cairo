import { useI18n } from "@/lib/i18n";

export function LanguageToggle() {
  const { lang, setLang, t } = useI18n();

  return (
    <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.15em]">
      <span className="sr-only">{t("lang.label")}</span>
      {(["en", "ar"] as const).map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => setLang(option)}
          aria-pressed={lang === option}
          className={`border-b pb-1 transition-colors ${
            lang === option
              ? "border-white text-white"
              : "border-transparent text-[#9a9a9a] hover:text-white"
          }`}
        >
          {option === "en" ? "EN" : "عربي"}
        </button>
      ))}
    </div>
  );
}
