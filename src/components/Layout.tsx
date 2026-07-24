import { Link, useNavigate } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { ShoppingBag, UserRound } from "lucide-react";
import { useCart } from "@/lib/cart";
import { useAuth } from "@/lib/auth";
import { JABAL_LOGO_URL, JABAL_SUPPORT_EMAIL, JABAL_SUPPORT_PHONE } from "@/lib/supabase";
import { OfferTopBar } from "@/components/OfferTopBar";
import { useI18n, type Lang } from "@/lib/i18n";

function whatsappHref(phone: string) {
  const digits = phone.replace(/\D/g, "");
  const intl = digits.startsWith("0") ? `20${digits.slice(1)}` : digits;
  return `https://wa.me/${intl}`;
}

function WhatsAppButton() {
  return (
    <a
      href={whatsappHref(JABAL_SUPPORT_PHONE)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat on WhatsApp"
      title="Chat on WhatsApp"
      className="fixed z-[200] inline-flex items-center justify-center"
      style={{
        insetInlineEnd: 20,
        bottom: 20,
        width: 56,
        height: 56,
        borderRadius: "50%",
        background: "#25D366",
        boxShadow: "0 4px 14px rgba(0,0,0,0.35)",
      }}
    >
      <svg viewBox="0 0 32 32" width={32} height={32} aria-hidden="true">
        <path
          fill="#fff"
          d="M16.004 3C9.373 3 4 8.373 4 15.004c0 2.386.674 4.612 1.84 6.502L4 29l7.68-1.812a11.94 11.94 0 0 0 4.324.812H16c6.63 0 12-5.373 12-12.004C28 8.373 22.63 3 16.004 3zm6.994 17.03c-.294.826-1.457 1.516-2.386 1.71-.634.132-1.462.238-4.248-.912-3.564-1.475-5.86-5.084-6.038-5.32-.176-.236-1.446-1.926-1.446-3.674 0-1.748.916-2.606 1.24-2.964.324-.358.706-.448.942-.448.236 0 .472.002.678.012.218.01.51-.083.798.608.294.708.998 2.456 1.084 2.634.088.178.146.386.03.622-.116.236-.176.386-.352.594-.176.208-.372.464-.53.624-.176.176-.36.368-.154.72.206.352.916 1.51 1.966 2.446 1.35 1.204 2.488 1.578 2.84 1.754.352.176.558.148.764-.088.206-.236.882-1.028 1.118-1.38.236-.352.472-.294.796-.176.324.118 2.06.972 2.414 1.148.352.176.588.264.674.412.088.148.088.856-.206 1.682z"
        />
      </svg>
    </a>
  );
}

export function Layout({
  children,
  showWhatsApp = true,
}: {
  children: ReactNode;
  showWhatsApp?: boolean;
}) {
  const { count } = useCart();
  const { user, isAdmin, signOut } = useAuth();
  const { lang, setLang, t } = useI18n();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleLogout = async () => {
    await signOut();
    navigate({ to: "/" });
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#000", color: "#fff" }}>
      <header className="sticky top-0 z-[100]" style={{ background: "#000" }}>
        <OfferTopBar user={user} />
        <nav
          className="jabal-nav flex items-center justify-between px-3 sm:px-5 md:px-8 lg:px-10 gap-3"
          style={{ background: "#000", borderBottom: "1px solid #262626", height: 72 }}
        >
          <Link to="/" className="flex items-center shrink min-w-0" style={{ height: 40 }}>
            <img src={JABAL_LOGO_URL} alt="JABAL" className="jabal-logo-img" />
          </Link>

          <div
            className="hidden lg:flex gap-5 xl:gap-8 items-center"
            style={{
              fontSize: 12,
              letterSpacing: lang === "ar" ? 0 : "0.18em",
              textTransform: "uppercase",
              fontWeight: 400,
            }}
          >
            <Link
              to="/men"
              aria-label={t("nav.men")}
              className="hover:underline"
              style={{ color: "#fff", textUnderlineOffset: 4 }}
            >
              {t("nav.men")}
            </Link>{" "}
            <Link
              to="/women"
              aria-label={t("nav.women")}
              className="hover:underline"
              style={{ color: "#fff", textUnderlineOffset: 4 }}
            >
              {t("nav.women")}
            </Link>
          </div>

          <div className="jabal-header-actions flex items-center gap-2 sm:gap-3 lg:gap-5">
            <div
              className="hidden lg:flex items-center gap-4"
              style={{
                fontSize: 11,
                letterSpacing: lang === "ar" ? 0 : "0.18em",
                textTransform: "uppercase",
              }}
            >
              {user ? (
                <>
                  <Link to="/account" style={{ color: "#fff" }} className="hover:underline">
                    {t("nav.account")}
                  </Link>{" "}
                  {isAdmin && (
                    <Link to="/admin" style={{ color: "#fff" }} className="hover:underline">
                      Admin
                    </Link>
                  )}
                  <button
                    onClick={handleLogout}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "#9a9a9a",
                      cursor: "pointer",
                      fontSize: 11,
                      letterSpacing: lang === "ar" ? 0 : "0.18em",
                      textTransform: "uppercase",
                    }}
                  >
                    {t("nav.logout")}
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" style={{ color: "#fff" }} className="hover:underline">
                    {t("nav.login")}
                  </Link>{" "}
                  <Link
                    to="/register"
                    search={{ google: undefined }}
                    style={{ color: "#fff" }}
                    className="hover:underline"
                  >
                    {t("nav.register")}
                  </Link>
                </>
              )}
            </div>

            <label className="sr-only" htmlFor="jabal-language">
              {t("lang.label")}
            </label>
            <select
              id="jabal-language"
              value={lang}
              onChange={(e) => setLang(e.target.value as Lang)}
              aria-label={t("lang.label")}
              style={{
                height: 34,
                background: "#000",
                color: "#fff",
                border: "1px solid #262626",
                padding: "0 8px",
                fontSize: 11,
                letterSpacing: lang === "ar" ? 0 : "0.12em",
                textTransform: "uppercase",
                cursor: "pointer",
              }}
              className="jabal-lang-select"
            >
              <option value="en">English</option>
              <option value="ar">العربية</option>
            </select>

            <Link
              to={user ? "/account" : "/login"}
              className="jabal-icon-link relative inline-flex items-center justify-center"
              aria-label={user ? t("nav.account") : t("nav.login")}
              title={user ? t("nav.account") : t("nav.login")}
              style={{
                color: "#fff",
                width: 38,
                height: 38,
                border: "1px solid #262626",
                background: "linear-gradient(180deg, #090909 0%, #000 100%)",
              }}
            >
              <UserRound size={19} strokeWidth={1.7} aria-hidden="true" />
            </Link>

            <Link
              to="/cart"
              className="jabal-icon-link relative inline-flex items-center justify-center"
              aria-label={t("nav.bag")}
              style={{
                color: "#fff",
                width: 38,
                height: 38,
                border: "1px solid #262626",
                background: "linear-gradient(180deg, #090909 0%, #000 100%)",
              }}
            >
              <ShoppingBag size={19} strokeWidth={1.7} aria-hidden="true" />
              {count > 0 && (
                <span
                  className="absolute"
                  style={{
                    top: -7,
                    insetInlineEnd: -7,
                    minWidth: 19,
                    height: 19,
                    padding: "0 5px",
                    borderRadius: 999,
                    background: "#fff",
                    color: "#000",
                    fontSize: 10,
                    fontWeight: 700,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    lineHeight: 1,
                    border: "1px solid #000",
                  }}
                >
                  {count}
                </span>
              )}
            </Link>

            <button
              className="lg:hidden jabal-icon-link"
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
            className="lg:hidden flex flex-col"
            style={{ background: "#000", borderBottom: "1px solid #262626" }}
          >
            {[
              { to: "/men", label: t("nav.men") },
              { to: "/women", label: t("nav.women") },
            ].map((l) => (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                style={{
                  padding: "16px 20px",
                  fontSize: 12,
                  letterSpacing: lang === "ar" ? 0 : "0.18em",
                  textTransform: "uppercase",
                  borderBottom: "1px solid #262626",
                  color: "#fff",
                }}
              >
                {l.label}
              </Link>
            ))}
            {user ? (
              <>
                <Link to="/account" onClick={() => setOpen(false)} style={mobileItem}>
                  {t("nav.account")}
                </Link>
                {isAdmin && (
                  <Link to="/admin" onClick={() => setOpen(false)} style={mobileItem}>
                    Admin
                  </Link>
                )}
                <button
                  onClick={() => {
                    setOpen(false);
                    handleLogout();
                  }}
                  style={{
                    ...mobileItem,
                    textAlign: "start",
                    background: "transparent",
                    border: "none",
                  }}
                >
                  {t("nav.logout")}
                </button>
              </>
            ) : (
              <>
                <Link to="/login" onClick={() => setOpen(false)} style={mobileItem}>
                  {t("nav.login")}
                </Link>
                <Link
                  to="/register"
                  search={{ google: undefined }}
                  onClick={() => setOpen(false)}
                  style={mobileItem}
                >
                  {t("nav.register")}
                </Link>
              </>
            )}
          </div>
        )}
      </header>

      <main className="flex-1">{children}</main>

      <footer style={{ background: "#000", borderTop: "1px solid #262626", marginTop: 80 }}>
        <div className="max-w-6xl mx-auto px-6 md:px-12 py-12">
          <div className="grid md:grid-cols-2 gap-10">
            <div>
              <img
                src={JABAL_LOGO_URL}
                alt="JABAL"
                style={{ height: 28, filter: "invert(1) brightness(2)" }}
              />
            </div>
            <div data-nosnippet>
              <div className="jb-eyebrow" style={{ color: "#fff" }}>
                {t("footer.help")}
              </div>
              <ul className="mt-4 space-y-2" style={{ fontSize: 13, color: "#9a9a9a" }}>
                <li>
                  <span style={{ color: "#fff" }}>{t("footer.email")}</span>{" "}
                  <a
                    href={`mailto:${JABAL_SUPPORT_EMAIL}`}
                    className="hover:underline"
                    style={{ color: "#9a9a9a" }}
                  >
                    {JABAL_SUPPORT_EMAIL}
                  </a>
                </li>
                <li>
                  <span style={{ color: "#fff" }}>{t("footer.phone")}</span>{" "}
                  <a
                    href={`tel:${JABAL_SUPPORT_PHONE}`}
                    className="hover:underline"
                    style={{ color: "#9a9a9a" }}
                  >
                    {JABAL_SUPPORT_PHONE}
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div
            className="mt-10 pt-6 flex flex-col md:flex-row justify-between gap-3"
            style={{
              borderTop: "1px solid #262626",
              fontSize: 11,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              color: "#9a9a9a",
            }}
          >
            <div>
              © {new Date().getFullYear()} JABAL. {t("footer.rights")}
            </div>
          </div>
        </div>
      </footer>

      {showWhatsApp && <WhatsAppButton />}
    </div>
  );
}

const mobileItem: React.CSSProperties = {
  padding: "16px 20px",
  fontSize: 12,
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  borderBottom: "1px solid #262626",
  color: "#fff",
  display: "block",
  width: "100%",
};

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`jb-shimmer ${className}`} />;
}

export function ErrorBanner({
  message = "Something went wrong. Please refresh.",
}: {
  message?: string;
}) {
  return (
    <div
      style={{
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
