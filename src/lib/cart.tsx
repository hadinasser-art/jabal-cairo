import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type CartItem = {
  id: string;
  variantId?: string | null;
  name: string;
  price_egp: number;
  image_url: string | null;
  selectedSize: string | null;
  selectedColor: string | null;
  quantity: number;
  stock_quantity: number;
};

type CartCtx = {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (id: string, size: string | null, color: string | null, variantId?: string | null) => void;
  updateQty: (id: string, size: string | null, color: string | null, qty: number, variantId?: string | null) => void;
  clear: () => void;
  count: number;
  subtotal: number;
};

const Ctx = createContext<CartCtx | null>(null);
const KEY = "jabal_cart_v1";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem(KEY, JSON.stringify(items));
  }, [items, hydrated]);

  const match = (a: CartItem, id: string, s: string | null, c: string | null, variantId?: string | null) =>
    a.id === id && (variantId ? a.variantId === variantId : a.selectedSize === s && a.selectedColor === c && !a.variantId);

  const addItem = (item: CartItem) =>
    setItems((prev) => {
      const i = prev.findIndex((p) => match(p, item.id, item.selectedSize, item.selectedColor, item.variantId));
      if (i >= 0) {
        const next = [...prev];
        next[i] = { ...next[i], quantity: Math.min(next[i].quantity + item.quantity, item.stock_quantity) };
        return next;
      }
      return [...prev, item];
    });

  const removeItem = (id: string, s: string | null, c: string | null, variantId?: string | null) =>
    setItems((prev) => prev.filter((p) => !match(p, id, s, c, variantId)));

  const updateQty = (id: string, s: string | null, c: string | null, qty: number, variantId?: string | null) =>
    setItems((prev) =>
      prev.map((p) =>
        match(p, id, s, c, variantId) ? { ...p, quantity: Math.max(1, Math.min(qty, p.stock_quantity)) } : p,
      ),
    );

  const clear = () => setItems([]);
  const count = items.reduce((s, i) => s + i.quantity, 0);
  const subtotal = items.reduce((s, i) => s + i.price_egp * i.quantity, 0);

  return (
    <Ctx.Provider value={{ items, addItem, removeItem, updateQty, clear, count, subtotal }}>
      {children}
    </Ctx.Provider>
  );
}

export function useCart() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCart must be inside CartProvider");
  return c;
}
