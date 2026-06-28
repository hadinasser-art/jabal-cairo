import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useCart } from "@/lib/cart";
import { useI18n, type Lang } from "@/lib/i18n";

export function Layout({ children }: { children: ReactNode }) {
  const { count } = useCart();
  const { t, lang, setLang, dir } = useI18n();
  const [open, setOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const langRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) setLangOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div
      className="min-h-screen flex flex-col"
      dir={dir}
      style={{ background: "var(--jb-bg)", color: "var(--jb-ink)" }}
    >
      {/* Promo strip */}
      <div
        className="text-center px-4"
        style={{
          background: "#fff",
          color: "#000",
          fontSize: "11px",
          letterSpacing: lang === "ar" ? "0" : "0.15em",
          textTransform: "uppercase",
          padding: "8px 16px",
          fontWeight: 500,
        }}
      >
        {t("promo")}
      </div>

      {/* Nav */}
      <nav
        className="sticky top-0 z-[100] flex items-center justify-between px-5 md:px-10"
        style={{
          background: "#000",
          borderBottom: "1px solid var(--jb-line)",
          height: "64px",
        }}
      >
        <Link
          to="/"
          style={{
            fontSize: "18px",
            letterSpacing: "0.22em",
            fontWeight: 600,
            textTransform: "uppercase",
            color: "#fff",
          }}
        >
          JABAL
        </Link>

        <div
          className="hidden md:flex gap-10 items-center"
          style={{ fontSize: "12px", letterSpacing: lang === "ar" ? "0" : "0.18em", textTransform: "uppercase", fontWeight: 400 }}
        >
          <Link to="/" hash="men" className="hover:underline" style={{ textUnderlineOffset: 4, color: "#fff" }}>{t("nav.men")}</Link>
          <Link to="/" hash="women" className="hover:underline" style={{ textUnderlineOffset: 4, color: "#fff" }}>{t("nav.women")}</Link>
          <Link to="/shop" className="hover:underline" style={{ textUnderlineOffset: 4, color: "#fff" }}>{t("nav.shop")}</Link>
        </div>

        <div className="flex items-center gap-5">
          {/* Language dropdown */}
          <div className="relative" ref={langRef}>
            <button
              type="button"
              onClick={() => setLangOpen((v) => !v)}
              aria-label={t("lang.label")}
              style={{
                fontSize: 11,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "#fff",
                background: "transparent",
                border: "1px solid var(--jb-line)",
                padding: "6px 10px",
                cursor: "pointer",
              }}
            >
              {lang === "en" ? "EN" : "ع"}
            </button>
            {langOpen && (
              <div
                className="absolute"
                style={{
                  top: "calc(100% + 6px)",
                  right: dir === "rtl" ? "auto" : 0,
                  left: dir === "rtl" ? 0 : "auto",
                  background: "#000",
                  border: "1px solid var(--jb-line)",
                  minWidth: 140,
                  zIndex: 200,
                }}
              >
                {(["en", "ar"] as Lang[]).map((l) => (
                  <button
                    key={l}
                    onClick={() => { setLang(l); setLangOpen(false); }}
                    style={{
                      display: "block",
                      width: "100%",
                      textAlign: dir === "rtl" ? "right" : "left",
                      padding: "10px 14px",
                      fontSize: 12,
                      letterSpacing: lang === "ar" ? "0" : "0.12em",
                      textTransform: "uppercase",
                      color: l === lang ? "#fff" : "#9a9a9a",
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    {l === "en" ? "English" : "العربية"}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Bag icon */}
          <Link
            to="/cart"
            className="relative inline-flex items-center justify-center"
            aria-label={t("nav.bag")}
            style={{ color: "#fff", width: 32, height: 32 }}
          >
            <BagIcon />
            {count > 0 && (
              <span
                className="absolute"
                style={{
                  top: -4,
                  right: -6,
                  minWidth: 18,
                  height: 18,
                  padding: "0 5px",
                  borderRadius: 999,
                  background: "#fff",
                  color: "#000",
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: 0,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  lineHeight: 1,
                }}
              >
                {count}
              </span>
            )}
          </Link>

          <button
            className="md:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label="Menu"
            style={{ fontSize: 18, color: "#fff", background: "transparent", border: "none" }}
          >
            {open ? "✕" : "☰"}
          </button>
        </div>
      </nav>

      {open && (
        <div
          className="md:hidden flex flex-col"
          style={{ background: "#000", borderBottom: "1px solid var(--jb-line)" }}
        >
          {[
            { to: "/" as const, hash: "men", label: t("nav.men") },
            { to: "/" as const, hash: "women", label: t("nav.women") },
            { to: "/shop" as const, hash: undefined, label: t("nav.shop") },
          ].map((l, i) => (
            <Link
              key={i}
              to={l.to}
              hash={l.hash}
              onClick={() => setOpen(false)}
              style={{
                padding: "16px 20px",
                fontSize: 12,
                letterSpacing: lang === "ar" ? "0" : "0.18em",
                textTransform: "uppercase",
                borderBottom: "1px solid var(--jb-line)",
                color: "#fff",
              }}
            >
              {l.label}
            </Link>
          ))}
        </div>
      )}

      <main className="flex-1">{children}</main>

      {/* Simple Footer */}
      <footer style={{ background: "#000", borderTop: "1px solid var(--jb-line)", marginTop: 80 }}>
        <div className="max-w-6xl mx-auto px-6 md:px-12 py-12">
          <div className="grid md:grid-cols-2 gap-10">
            <div>
              <div style={{ fontSize: 18, letterSpacing: "0.22em", textTransform: "uppercase", fontWeight: 600, color: "#fff" }}>
                JABAL
              </div>
              <div className="jb-eyebrow mt-3">{t("footer.location")}</div>
            </div>
            <div>
              <div className="jb-eyebrow" style={{ color: "#fff" }}>{t("footer.help")}</div>
              <ul className="mt-4 space-y-2" style={{ fontSize: 13, color: "var(--jb-muted)" }}>
                <li>
                  <a href="mailto:Amirasedik24@gmail.com" className="hover:underline" style={{ color: "var(--jb-muted)" }}>
                    {t("footer.email")}: Amirasedik24@gmail.com
                  </a>
                </li>
                <li>
                  <a href="tel:01061024345" className="hover:underline" style={{ color: "var(--jb-muted)" }}>
                    {t("footer.phone")}: 01061024345
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div
            className="mt-10 pt-6 flex flex-col md:flex-row justify-between gap-3"
            style={{ borderTop: "1px solid var(--jb-line)", fontSize: 11, letterSpacing: lang === "ar" ? "0" : "0.15em", textTransform: "uppercase", color: "var(--jb-muted)" }}
          >
            <div>© {new Date().getFullYear()} JABAL. {t("footer.rights")}</div>
            <div>{t("footer.location")}</div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function BagIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 7h12l-1 13H7L6 7Z" />
      <path d="M9 7a3 3 0 0 1 6 0" />
    </svg>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`jb-shimmer ${className}`} />;
}

export function ErrorBanner({ message = "Something went wrong. Please refresh." }: { message?: string }) {
  return (
    <div
      style={{
        background: "transparent",
        border: "1px solid #fff",
        padding: "14px 18px",
        fontSize: 12,
        letterSpacing: "0.15em",
        textTransform: "uppercase",
        color: "#fff",
      }}
    >
      {message}
    </div>
  );
}
