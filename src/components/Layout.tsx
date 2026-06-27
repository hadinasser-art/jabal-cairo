import { Link } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { useCart } from "@/lib/cart";

export function Layout({ children }: { children: ReactNode }) {
  const { count } = useCart();
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--jb-bg)", color: "var(--jb-ink)" }}>
      {/* Promo strip */}
      <div
        className="text-center px-4"
        style={{
          background: "#111",
          color: "#fff",
          fontSize: "11px",
          letterSpacing: "0.15em",
          textTransform: "uppercase",
          padding: "8px 16px",
          fontWeight: 400,
        }}
      >
        New season — free shipping above EGP 2,000
      </div>

      {/* Nav */}
      <nav
        className="sticky top-0 z-[100] flex items-center justify-between px-5 md:px-10"
        style={{
          background: "#fff",
          borderBottom: "1px solid var(--jb-line)",
          height: "64px",
        }}
      >
        <Link
          to="/"
          style={{
            fontSize: "18px",
            letterSpacing: "0.22em",
            fontWeight: 500,
            textTransform: "uppercase",
            color: "var(--jb-ink)",
          }}
        >
          Jabal
        </Link>

        <div
          className="hidden md:flex gap-10 items-center"
          style={{ fontSize: "12px", letterSpacing: "0.18em", textTransform: "uppercase", fontWeight: 400 }}
        >
          <Link to="/" hash="men" className="hover:underline" style={{ textUnderlineOffset: 4 }}>Men</Link>
          <Link to="/" hash="women" className="hover:underline" style={{ textUnderlineOffset: 4 }}>Women</Link>
          <Link to="/shop" className="hover:underline" style={{ textUnderlineOffset: 4 }}>Shop</Link>
          <Link to="/" hash="men" className="hover:underline" style={{ textUnderlineOffset: 4 }}>New in</Link>
        </div>


        <div className="flex items-center gap-5">
          <Link
            to="/cart"
            className="relative flex items-center gap-2"
            style={{ fontSize: "12px", letterSpacing: "0.18em", textTransform: "uppercase", fontWeight: 400 }}
          >
            Bag
            {count > 0 && (
              <span
                className="inline-flex items-center justify-center"
                style={{
                  width: 20, height: 20, borderRadius: 999,
                  background: "var(--jb-ink)", color: "#fff",
                  fontSize: 10, fontWeight: 500, letterSpacing: 0,
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
            style={{ fontSize: 18, color: "var(--jb-ink)" }}
          >
            {open ? "✕" : "☰"}
          </button>
        </div>
      </nav>

      {open && (
        <div
          className="md:hidden flex flex-col"
          style={{ background: "#fff", borderBottom: "1px solid var(--jb-line)" }}
        >
          {[
            { to: "/shop", label: "Shop" },
            { to: "/shop", label: "New in" },
            { to: "/shop", label: "Sale" },
          ].map((l, i) => (
            <Link
              key={i}
              to={l.to}
              onClick={() => setOpen(false)}
              style={{
                padding: "16px 20px",
                fontSize: 12,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                borderBottom: "1px solid var(--jb-line)",
                color: "var(--jb-ink)",
              }}
            >
              {l.label}
            </Link>
          ))}
        </div>
      )}

      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer style={{ background: "#fff", borderTop: "1px solid var(--jb-line)", marginTop: 80 }}>
        <div className="max-w-7xl mx-auto px-6 md:px-12 py-16">
          <div className="grid md:grid-cols-4 gap-10">
            <div>
              <div style={{ fontSize: 18, letterSpacing: "0.22em", textTransform: "uppercase", fontWeight: 500 }}>
                Jabal
              </div>
              <div className="jb-eyebrow mt-3">Cairo, Egypt</div>
            </div>
            <FooterCol title="Shop" items={["New in", "Tops", "Bottoms", "Outerwear"]} />
            <FooterCol title="Help" items={["Shipping", "Returns", "Size guide", "Contact"]} />
            <FooterCol title="Company" items={["About", "Stores", "Sustainability"]} />
          </div>
          <div
            className="mt-16 pt-8 flex flex-col md:flex-row justify-between gap-3"
            style={{ borderTop: "1px solid var(--jb-line)", fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--jb-muted)" }}
          >
            <div>© {new Date().getFullYear()} Jabal. All rights reserved.</div>
            <div>Cairo · Egypt</div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FooterCol({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <div className="jb-eyebrow" style={{ color: "var(--jb-ink)" }}>{title}</div>
      <ul className="mt-4 space-y-2">
        {items.map((it) => (
          <li key={it} style={{ fontSize: 13, color: "var(--jb-muted)" }}>{it}</li>
        ))}
      </ul>
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`jb-shimmer ${className}`} />;
}

export function ErrorBanner({ message = "Something went wrong. Please refresh." }: { message?: string }) {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid var(--jb-ink)",
        padding: "14px 18px",
        fontSize: 12,
        letterSpacing: "0.15em",
        textTransform: "uppercase",
        color: "var(--jb-ink)",
      }}
    >
      {message}
    </div>
  );
}
