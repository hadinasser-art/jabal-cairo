import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useCart } from "@/lib/cart";
import { useAuth } from "@/lib/auth";
import { JABAL_LOGO_URL, JABAL_SUPPORT_EMAIL, JABAL_SUPPORT_PHONE } from "@/lib/supabase";

export function Layout({ children }: { children: ReactNode }) {
  const { count } = useCart();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const shopRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (shopRef.current && !shopRef.current.contains(e.target as Node)) setShopOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const handleLogout = async () => {
    await signOut();
    navigate({ to: "/" });
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#000", color: "#fff" }}>
      <nav
        className="sticky top-0 z-[100] flex items-center justify-between px-5 md:px-10"
        style={{ background: "#000", borderBottom: "1px solid #262626", height: 72 }}
      >
        <Link to="/" className="flex items-center" style={{ height: 40 }}>
          <img src={JABAL_LOGO_URL} alt="JABAL" style={{ height: 32, width: "auto", filter: "invert(1) brightness(2)" }} />
        </Link>

        <div
          className="hidden md:flex gap-8 items-center"
          style={{ fontSize: 12, letterSpacing: "0.18em", textTransform: "uppercase", fontWeight: 400 }}
        >
          <Link to="/men" className="hover:underline" style={{ color: "#fff", textUnderlineOffset: 4 }}>Men</Link>
          <Link to="/women" className="hover:underline" style={{ color: "#fff", textUnderlineOffset: 4 }}>Women</Link>
          <div
            ref={shopRef}
            className="relative"
            onMouseEnter={() => setShopOpen(true)}
            onMouseLeave={() => setShopOpen(false)}
          >
            <Link
              to="/shop"
              className="hover:underline"
              style={{ color: "#fff", textUnderlineOffset: 4 }}
              onClick={() => setShopOpen(false)}
            >
              Shop ▾
            </Link>
            {shopOpen && (
              <div
                style={{
                  position: "absolute", top: "100%", left: 0, marginTop: 8,
                  background: "#000", border: "1px solid #fff", minWidth: 200, zIndex: 200,
                }}
              >
                <Link
                  to="/men"
                  onClick={() => setShopOpen(false)}
                  style={{ display: "block", padding: "14px 18px", color: "#fff", fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", borderBottom: "1px solid #262626" }}
                >Shop Men</Link>
                <Link
                  to="/women"
                  onClick={() => setShopOpen(false)}
                  style={{ display: "block", padding: "14px 18px", color: "#fff", fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase" }}
                >Shop Women</Link>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4 md:gap-5">
          <div className="hidden md:flex items-center gap-4" style={{ fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase" }}>
            {user ? (
              <>
                <Link to="/account" style={{ color: "#fff" }} className="hover:underline">My Account</Link>
                <button onClick={handleLogout} style={{ background: "transparent", border: "none", color: "#9a9a9a", cursor: "pointer", fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase" }}>
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" style={{ color: "#fff" }} className="hover:underline">Login</Link>
                <Link to="/register" style={{ color: "#fff" }} className="hover:underline">Register</Link>
              </>
            )}
          </div>

          <Link
            to="/cart"
            className="relative inline-flex items-center justify-center"
            aria-label="Bag"
            style={{ color: "#fff", width: 32, height: 32 }}
          >
            <BagIcon />
            {count > 0 && (
              <span
                className="absolute"
                style={{
                  top: -4, right: -6, minWidth: 18, height: 18, padding: "0 5px",
                  borderRadius: 999, background: "#fff", color: "#000",
                  fontSize: 10, fontWeight: 600, display: "inline-flex",
                  alignItems: "center", justifyContent: "center", lineHeight: 1,
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
        <div className="md:hidden flex flex-col" style={{ background: "#000", borderBottom: "1px solid #262626" }}>
          {[
            { to: "/men", label: "Men" },
            { to: "/women", label: "Women" },
            { to: "/shop", label: "Shop" },
          ].map((l) => (
            <Link
              key={l.to}
              to={l.to}
              onClick={() => setOpen(false)}
              style={{ padding: "16px 20px", fontSize: 12, letterSpacing: "0.18em", textTransform: "uppercase", borderBottom: "1px solid #262626", color: "#fff" }}
            >
              {l.label}
            </Link>
          ))}
          {user ? (
            <>
              <Link to="/account" onClick={() => setOpen(false)} style={mobileItem}>My Account</Link>
              <button onClick={() => { setOpen(false); handleLogout(); }} style={{ ...mobileItem, textAlign: "left", background: "transparent", border: "none" }}>Logout</button>
            </>
          ) : (
            <>
              <Link to="/login" onClick={() => setOpen(false)} style={mobileItem}>Login</Link>
              <Link to="/register" onClick={() => setOpen(false)} style={mobileItem}>Register</Link>
            </>
          )}
        </div>
      )}

      <main className="flex-1">{children}</main>

      <footer style={{ background: "#000", borderTop: "1px solid #262626", marginTop: 80 }}>
        <div className="max-w-6xl mx-auto px-6 md:px-12 py-12">
          <div className="grid md:grid-cols-2 gap-10">
            <div>
              <img src={JABAL_LOGO_URL} alt="JABAL" style={{ height: 28, filter: "invert(1) brightness(2)" }} />
              <div className="jb-eyebrow mt-3">Cairo, Egypt</div>
            </div>
            <div>
              <div className="jb-eyebrow" style={{ color: "#fff" }}>Help</div>
              <ul className="mt-4 space-y-2" style={{ fontSize: 13, color: "#9a9a9a" }}>
                <li>
                  <a href={`mailto:${JABAL_SUPPORT_EMAIL}`} className="hover:underline" style={{ color: "#9a9a9a" }}>
                    {JABAL_SUPPORT_EMAIL}
                  </a>
                </li>
                <li>
                  <a href={`tel:${JABAL_SUPPORT_PHONE}`} className="hover:underline" style={{ color: "#9a9a9a" }}>
                    {JABAL_SUPPORT_PHONE}
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div
            className="mt-10 pt-6 flex flex-col md:flex-row justify-between gap-3"
            style={{ borderTop: "1px solid #262626", fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", color: "#9a9a9a" }}
          >
            <div>© {new Date().getFullYear()} JABAL. All rights reserved.</div>
            <div>Cairo, Egypt</div>
          </div>
        </div>
      </footer>
    </div>
  );
}

const mobileItem: React.CSSProperties = {
  padding: "16px 20px", fontSize: 12, letterSpacing: "0.18em",
  textTransform: "uppercase", borderBottom: "1px solid #262626", color: "#fff",
  display: "block", width: "100%",
};

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
    <div style={{ border: "1px solid #fff", padding: "14px 18px", fontSize: 12, letterSpacing: "0.15em", textTransform: "uppercase", color: "#fff" }}>
      {message}
    </div>
  );
}
