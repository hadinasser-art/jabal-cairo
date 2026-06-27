import { Link } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { useCart } from "@/lib/cart";

export function Layout({ children }: { children: ReactNode }) {
  const { count } = useCart();
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-white text-black">
      <div className="bg-black text-white text-center py-[10px] px-4 text-[0.75rem] tracking-[0.15em] uppercase">
        NEW DROP — SUMMER 2025 COLLECTION NOW LIVE. FREE SHIPPING ABOVE EGP 2,000
      </div>
      <nav className="sticky top-0 z-[100] bg-white border-b-[1.5px] border-black h-16 px-5 md:px-10 flex items-center justify-between">
        <Link to="/" className="font-black text-[1.4rem] uppercase tracking-[0.15em]">
          JABAL
        </Link>
        <div className="hidden md:flex gap-10 items-center text-[0.8rem] uppercase tracking-[0.15em] font-bold">
          <Link to="/shop" className="hover:underline">Shop</Link>
          <Link to="/shop" search={{ filter: "sale" } as never} className="hover:underline">Sale</Link>
          <Link to="/shop" className="hover:underline">New In</Link>
        </div>
        <div className="flex items-center gap-4">
          <Link to="/cart" className="relative flex items-center font-bold uppercase tracking-[0.1em] text-[0.8rem]">
            Cart
            {count > 0 && (
              <span className="ml-2 inline-flex items-center justify-center min-w-[22px] h-[22px] px-1 bg-black text-white text-[0.7rem] font-bold">
                {count}
              </span>
            )}
          </Link>
          <button className="md:hidden font-bold text-xl" onClick={() => setOpen((v) => !v)} aria-label="Menu">
            {open ? "✕" : "☰"}
          </button>
        </div>
      </nav>
      {open && (
        <div className="md:hidden border-b-[1.5px] border-black bg-white flex flex-col text-[0.85rem] uppercase tracking-[0.15em] font-bold">
          <Link to="/shop" className="px-5 py-4 border-b border-black/10" onClick={() => setOpen(false)}>Shop</Link>
          <Link to="/shop" className="px-5 py-4 border-b border-black/10" onClick={() => setOpen(false)}>Sale</Link>
          <Link to="/shop" className="px-5 py-4" onClick={() => setOpen(false)}>New In</Link>
        </div>
      )}
      <main className="flex-1">{children}</main>
      <footer className="bg-black text-white px-6 md:px-12 py-16 mt-16">
        <div className="max-w-6xl mx-auto">
          <div className="text-5xl md:text-7xl font-black uppercase tracking-[-0.03em]">JABAL</div>
          <div className="mt-4 text-sm uppercase tracking-[0.15em]">Cairo, Egypt</div>
          <div className="mt-12 text-xs uppercase tracking-[0.15em] opacity-60">
            © {new Date().getFullYear()} JABAL. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`jabal-shimmer ${className}`} />;
}

export function ErrorBanner({ message = "Something went wrong. Please refresh." }: { message?: string }) {
  return (
    <div className="bg-black text-white px-6 py-4 text-sm uppercase tracking-[0.1em] font-bold">
      {message}
    </div>
  );
}
