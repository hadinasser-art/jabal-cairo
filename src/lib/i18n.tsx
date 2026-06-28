import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "en" | "ar";

type Dict = Record<string, { en: string; ar: string }>;

const DICT: Dict = {
  // nav / header
  "nav.men": { en: "Men", ar: "رجال" },
  "nav.women": { en: "Women", ar: "نساء" },
  "nav.shop": { en: "Shop", ar: "المتجر" },
  "nav.newin": { en: "New in", ar: "وصل حديثاً" },
  "nav.bag": { en: "Bag", ar: "الحقيبة" },
  "lang.label": { en: "Language", ar: "اللغة" },
  "lang.en": { en: "English", ar: "الإنجليزية" },
  "lang.ar": { en: "Arabic", ar: "العربية" },
  "promo": { en: "New season — free shipping above EGP 2,000", ar: "موسم جديد — شحن مجاني للطلبات فوق 2,000 جنيه" },

  // sections
  "men.eyebrow": { en: "Men", ar: "رجال" },
  "men.title": { en: "Men's everyday essentials", ar: "أساسيات الرجال اليومية" },
  "women.eyebrow": { en: "Women", ar: "نساء" },
  "women.title": { en: "Women's everyday essentials", ar: "أساسيات النساء اليومية" },
  "section.viewall": { en: "View all", ar: "عرض الكل" },

  // product cards / pdp
  "card.add": { en: "Add to cart", ar: "أضف إلى الحقيبة" },
  "card.soldout": { en: "Sold out", ar: "نفذت الكمية" },
  "card.quickadd": { en: "Quick add", ar: "إضافة سريعة" },
  "pdp.color": { en: "Color", ar: "اللون" },
  "pdp.size": { en: "Size", ar: "المقاس" },
  "pdp.qty": { en: "Quantity", ar: "الكمية" },
  "pdp.instock": { en: "in stock", ar: "متوفر" },
  "pdp.addbag": { en: "Add to bag", ar: "أضف إلى الحقيبة" },
  "pdp.selectsize": { en: "Please select a size", ar: "من فضلك اختر مقاساً" },
  "pdp.selectcolor": { en: "Please select a color", ar: "من فضلك اختر لوناً" },
  "pdp.ship": { en: "Free shipping above EGP 2,000 · 14-day returns", ar: "شحن مجاني فوق 2,000 جنيه · إرجاع خلال 14 يوماً" },

  // toast
  "toast.added": { en: "Added to bag", ar: "تمت الإضافة إلى الحقيبة" },
  "toast.view": { en: "View bag", ar: "عرض الحقيبة" },

  // cart
  "cart.title": { en: "Your bag", ar: "حقيبتك" },
  "cart.empty.eyebrow": { en: "Your bag", ar: "حقيبتك" },
  "cart.empty.title": { en: "Your bag is empty.", ar: "حقيبتك فارغة." },
  "cart.empty.sub": { en: "Find something you love from the new collection.", ar: "اكتشف قطعاً جديدة من المجموعة الحالية." },
  "cart.empty.cta": { en: "Shop the collection", ar: "تسوق المجموعة" },
  "cart.eyebrow": { en: "Checkout", ar: "إتمام الشراء" },
  "cart.summary": { en: "Summary", ar: "الملخص" },
  "cart.subtotal": { en: "Subtotal", ar: "المجموع الفرعي" },
  "cart.shipping": { en: "Shipping", ar: "الشحن" },
  "cart.shipping.next": { en: "Calculated next", ar: "يحسب لاحقاً" },
  "cart.total": { en: "Total", ar: "الإجمالي" },
  "cart.remove": { en: "Remove", ar: "إزالة" },
  "cart.qty": { en: "Qty", ar: "الكمية" },
  "form.name": { en: "Full name", ar: "الاسم الكامل" },
  "form.email": { en: "Email", ar: "البريد الإلكتروني" },
  "form.phone": { en: "Phone", ar: "الهاتف" },
  "form.address": { en: "Shipping address", ar: "عنوان الشحن" },
  "form.payment": { en: "Payment method", ar: "طريقة الدفع" },
  "pay.cod": { en: "Pay on delivery", ar: "الدفع عند الاستلام" },
  "pay.instapay": { en: "InstaPay", ar: "InstaPay" },
  "pay.cod.note": { en: "You will pay when your order arrives.", ar: "ستدفع عند وصول طلبك." },
  "pay.instapay.note": { en: "Send the InstaPay transfer to: 01061024345", ar: "أرسل تحويل InstaPay إلى: 01061024345" },
  "form.place": { en: "Place order", ar: "تأكيد الطلب" },
  "form.placing": { en: "Placing order…", ar: "جاري تأكيد الطلب…" },
  "form.error.fields": { en: "Please fill in all fields.", ar: "من فضلك املأ جميع الحقول." },
  "form.error.email": { en: "Please enter a valid email.", ar: "من فضلك أدخل بريداً إلكترونياً صحيحاً." },
  "form.error.phone": { en: "Please enter a valid phone number.", ar: "من فضلك أدخل رقم هاتف صحيح." },

  // confirmation
  "ok.eyebrow": { en: "Order confirmed", ar: "تم تأكيد الطلب" },
  "ok.title": { en: "Thank you for your order.", ar: "شكراً لطلبك." },
  "ok.orderid": { en: "Order ID", ar: "رقم الطلب" },
  "ok.copy": { en: "Tap to copy", ar: "اضغط للنسخ" },
  "ok.copied": { en: "Copied ✓", ar: "تم النسخ ✓" },
  "ok.continue": { en: "Continue shopping", ar: "متابعة التسوق" },

  // footer
  "footer.help": { en: "Help", ar: "المساعدة" },
  "footer.email": { en: "Email", ar: "البريد" },
  "footer.phone": { en: "Phone", ar: "الهاتف" },
  "footer.location": { en: "Cairo, Egypt", ar: "القاهرة، مصر" },
  "footer.rights": { en: "All rights reserved.", ar: "جميع الحقوق محفوظة." },

  // shop
  "shop.eyebrow": { en: "Shop", ar: "المتجر" },
  "shop.title": { en: "All products", ar: "كل المنتجات" },
  "shop.empty": { en: "No products in this category.", ar: "لا توجد منتجات في هذه الفئة." },
};

type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: (k: keyof typeof DICT | string) => string; dir: "ltr" | "rtl" };
const I18nCtx = createContext<Ctx | null>(null);

const KEY = "jabal_lang";

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    try {
      const v = localStorage.getItem(KEY);
      if (v === "ar" || v === "en") setLangState(v);
    } catch {}
  }, []);

  useEffect(() => {
    const dir = lang === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
  }, [lang]);

  const setLang = (l: Lang) => {
    setLangState(l);
    try { localStorage.setItem(KEY, l); } catch {}
  };

  const t = (k: string) => {
    const entry = (DICT as Record<string, { en: string; ar: string }>)[k];
    if (!entry) return k;
    return entry[lang];
  };

  return (
    <I18nCtx.Provider value={{ lang, setLang, t, dir: lang === "ar" ? "rtl" : "ltr" }}>
      {children}
    </I18nCtx.Provider>
  );
}

export function useI18n() {
  const c = useContext(I18nCtx);
  if (!c) throw new Error("useI18n must be inside I18nProvider");
  return c;
}
