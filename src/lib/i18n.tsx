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
  "nav.login": { en: "Login", ar: "تسجيل الدخول" },
  "nav.register": { en: "Register", ar: "إنشاء حساب" },
  "nav.account": { en: "My Account", ar: "حسابي" },
  "nav.logout": { en: "Logout", ar: "تسجيل الخروج" },
  "nav.shopmen": { en: "Shop Men", ar: "تسوق الرجال" },
  "nav.shopwomen": { en: "Shop Women", ar: "تسوق النساء" },
  "lang.label": { en: "Language", ar: "اللغة" },
  "lang.en": { en: "English", ar: "الإنجليزية" },
  "lang.ar": { en: "Arabic", ar: "العربية" },
  "promo": { en: "Free shipping above EGP 2,000", ar: "شحن مجاني للطلبات فوق 2,000 جنيه" },

  // sections
  "men.eyebrow": { en: "Men", ar: "رجال" },
  "men.title": { en: "Men's everyday essentials", ar: "أساسيات الرجال اليومية" },
  "women.eyebrow": { en: "Women", ar: "نساء" },
  "women.title": { en: "Women's everyday essentials", ar: "أساسيات النساء اليومية" },
  "section.viewall": { en: "View all", ar: "عرض الكل" },
  "section.empty": { en: "No products yet.", ar: "لا توجد منتجات حالياً." },
  "home.title": { en: "Effortless every day.", ar: "أناقة يومية بلا مجهود." },
  "home.sub": { en: "Considered essentials. Made for the modern wardrobe.", ar: "أساسيات مختارة لخزانة عصرية." },
  "home.featured.eyebrow": { en: "Featured", ar: "مختارات" },
  "home.featured.title": { en: "Most bought from JABAL", ar: "الأكثر شراءً من JABAL" },
  "home.men": { en: "Men's collection", ar: "مجموعة الرجال" },
  "home.women": { en: "Women's collection", ar: "مجموعة النساء" },

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
  "pdp.related": { en: "You may also like", ar: "قد يعجبك أيضاً" },
  "pdp.sizeChart": { en: "Size chart", ar: "جدول المقاسات" },

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
  "cart.contact": { en: "Contact", ar: "بيانات التواصل" },
  "cart.address": { en: "Shipping address", ar: "عنوان الشحن" },
  "cart.payment": { en: "Payment", ar: "الدفع" },
  "cart.login.note": { en: "for faster checkout and order history — or continue as a guest.", ar: "لإتمام الشراء أسرع ومتابعة طلباتك — أو أكمل كضيف." },
  "cart.subtotal": { en: "Subtotal", ar: "المجموع الفرعي" },
  "cart.shipping": { en: "Shipping", ar: "الشحن" },
  "cart.free": { en: "Free", ar: "مجاني" },
  "cart.shipping.next": { en: "Calculated next", ar: "يحسب لاحقاً" },
  "cart.total": { en: "Total", ar: "الإجمالي" },
  "cart.savings": { en: "Total savings", ar: "إجمالي التوفير" },
  "cart.questions": { en: "Questions?", ar: "هل لديك سؤال؟" },
  "cart.orderSummary": { en: "Order summary", ar: "ملخص الطلب" },
  "cart.offerEnds": { en: "Active offer ends in", ar: "ينتهي العرض خلال" },
  "cart.promo": { en: "Promo code", ar: "كود الخصم" },
  "cart.promo.placeholder": { en: "Enter code", ar: "أدخل الكود" },
  "cart.apply": { en: "Apply", ar: "تطبيق" },
  "cart.removeCode": { en: "Remove code", ar: "إزالة الكود" },
  "cart.promo.inactive": { en: "Promo code is not active.", ar: "كود الخصم غير نشط." },
  "cart.promo.invalid": { en: "Promo code does not apply to this order.", ar: "كود الخصم لا ينطبق على هذا الطلب." },
  "cart.remove": { en: "Remove", ar: "إزالة" },
  "cart.qty": { en: "Qty", ar: "الكمية" },
  "form.first": { en: "First name", ar: "الاسم الأول" },
  "form.last": { en: "Last name", ar: "اسم العائلة" },
  "form.name": { en: "Full name", ar: "الاسم الكامل" },
  "form.email": { en: "Email", ar: "البريد الإلكتروني" },
  "form.phone": { en: "Phone", ar: "الهاتف" },
  "form.address": { en: "Shipping address", ar: "عنوان الشحن" },
  "form.fullAddress": { en: "Full address", ar: "العنوان بالكامل" },
  "form.city": { en: "City", ar: "المدينة" },
  "form.governorate": { en: "Governorate", ar: "المحافظة" },
  "form.first.placeholder": { en: "Name", ar: "الاسم" },
  "form.last.placeholder": { en: "Name", ar: "الاسم" },
  "form.email.placeholder": { en: "name@example.com", ar: "name@example.com" },
  "form.phone.placeholder": { en: "01012345678", ar: "01012345678" },
  "form.fullAddress.placeholder": { en: "Building, street, area, apartment", ar: "العمارة، الشارع، المنطقة، الشقة" },
  "form.city.placeholder": { en: "Sheikh Zayed", ar: "الشيخ زايد" },
  "form.select": { en: "Select…", ar: "اختر…" },
  "form.save": { en: "Save this information for next time", ar: "احفظ هذه البيانات للمرة القادمة" },
  "form.payment": { en: "Payment method", ar: "طريقة الدفع" },
  "pay.cod.full": { en: "Cash on Delivery", ar: "الدفع عند الاستلام" },
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
  "ok.orders": { en: "View orders", ar: "عرض الطلبات" },

  // footer
  "footer.help": { en: "Help", ar: "المساعدة" },
  "footer.email": { en: "Email:", ar: "البريد:" },
  "footer.phone": { en: "Phone:", ar: "الهاتف:" },
  "footer.rights": { en: "All rights reserved.", ar: "جميع الحقوق محفوظة." },

  // shop
  "shop.eyebrow": { en: "Shop", ar: "المتجر" },
  "shop.title": { en: "All products", ar: "كل المنتجات" },
  "shop.empty": { en: "No products in this category.", ar: "لا توجد منتجات في هذه الفئة." },

  // offers
  "offer.code": { en: "Code", ar: "الكود" },
  "offer.ends": { en: "Ends in", ar: "ينتهي خلال" },
  "offer.shop": { en: "Shop", ar: "تسوق" },
  "offer.show": { en: "Show offer", ar: "عرض العرض" },
  "offer.exclusive": { en: "Exclusive offer", ar: "عرض خاص" },
  "offer.emailSignup": { en: "Sign up with email", ar: "سجل بالبريد الإلكتروني" },
  "offer.googleSignup": { en: "Continue with Google", ar: "المتابعة باستخدام Google" },
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
