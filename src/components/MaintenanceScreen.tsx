import { JABAL_SUPPORT_EMAIL } from "@/lib/supabase";
import { useI18n } from "@/lib/i18n";
import { LanguageToggle } from "@/components/LanguageToggle";
import { BrandMark } from "@/components/BrandMark";

export function MaintenanceScreen() {
  const { t } = useI18n();

  return (
    <div className="flex min-h-svh flex-col bg-black px-6 text-white">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between py-6 md:py-8">
        <BrandMark />
        <LanguageToggle />
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 items-center py-16 md:py-24">
        <div className="max-w-2xl">
          <p className="jb-eyebrow">{t("maintenance.eyebrow")}</p>
          <h1 className="mt-5 text-4xl font-light tracking-[-0.025em] sm:text-5xl md:text-6xl">
            {t("maintenance.title")}
          </h1>
          <p className="mt-7 max-w-xl text-sm leading-7 text-[#9a9a9a] md:text-base">
            {t("maintenance.body")}
          </p>
          <div className="mt-10 h-px w-20 bg-[#262626]" aria-hidden="true" />
          <p className="mt-8 text-sm leading-6 text-[#9a9a9a]">
            {t("maintenance.support")}{" "}
            <a
              href={`mailto:${JABAL_SUPPORT_EMAIL}`}
              className="text-white underline decoration-[#9a9a9a] underline-offset-4 transition-colors hover:decoration-white"
            >
              {JABAL_SUPPORT_EMAIL}
            </a>
          </p>
        </div>
      </main>

      <footer className="mx-auto w-full max-w-6xl border-t border-[#262626] py-6 text-[11px] uppercase tracking-[0.15em] text-[#9a9a9a] md:py-8">
        © {new Date().getFullYear()} JABAL. {t("footer.rights")}
      </footer>
    </div>
  );
}
