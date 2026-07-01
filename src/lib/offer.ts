import type { User } from "@supabase/supabase-js";
import type { Lang } from "./i18n";
import { supabase } from "./supabase";

export type DiscountType = "percentage" | "fixed" | "free_shipping";

export type Offer = {
  id: string;
  title: string;
  title_ar?: string | null;
  description: string | null;
  description_ar?: string | null;
  discount_type: DiscountType | string | null;
  discount_value: number | null;
  first_order_only: boolean | null;
  code: string | null;
  offer_type: string | null;
  active: boolean | null;
  priority: number | null;
  minimum_order_egp: number | null;
  start_date: string | null;
  end_date: string | null;
  max_uses: number | null;
  uses_count: number | null;
  duration_hours: number | null;
};

export type AppliedOffer = {
  offer: Offer;
  savedEgp: number;
  subtotalBefore: number;
  subtotalAfter: number;
  freeShipping: boolean;
};

export type OfferTotals = {
  appliedOffers: AppliedOffer[];
  subtotalAfterDiscounts: number;
  shippingFee: number;
  discountTotal: number;
  total: number;
};

export type OfferEligibilityOptions = {
  user: User | null;
  firstOrderEligible: boolean;
  enteredCode?: string;
};

const normalizeCode = (code: string | null | undefined) => (code ?? "").trim().toLowerCase();
const normalizeCopy = (value: string | null | undefined) => (value ?? "").trim().toLowerCase();
const money = (value: number) => Math.max(0, Math.round(value));
const timeValue = (value: string | null) => (value ? new Date(value).getTime() : null);

export async function fetchOffers(): Promise<Offer[]> {
  const { data, error } = await supabase.from("offers").select("*");
  if (error) {
    console.warn("fetchOffers", error.message);
    return [];
  }
  return ((data as Offer[]) ?? []).sort(byPriorityDesc);
}

export function byPriorityDesc(a: Offer, b: Offer) {
  return (b.priority ?? 0) - (a.priority ?? 0);
}

export function isActiveOffer(offer: Offer, now = Date.now()) {
  const startsAt = timeValue(offer.start_date);
  const endsAt = timeValue(offer.end_date);
  const maxUses = offer.max_uses;
  const uses = offer.uses_count ?? 0;

  return (
    offer.active === true &&
    (startsAt === null || startsAt <= now) &&
    (endsAt === null || endsAt > now) &&
    (maxUses === null || uses < maxUses)
  );
}

export function durationEndTime(offer: Offer): number | null {
  if (offer.duration_hours === null || offer.duration_hours === undefined) return null;
  const startsAt = timeValue(offer.start_date);
  if (startsAt === null) return null;
  return startsAt + offer.duration_hours * 60 * 60 * 1000;
}

export function isDurationStillValid(offer: Offer, now = Date.now()) {
  if (
    offer.duration_hours !== null &&
    offer.duration_hours !== undefined &&
    offer.start_date === null
  )
    return false;
  const endsAt = durationEndTime(offer);
  return endsAt === null || endsAt > now;
}

export function getActiveOffers(offers: Offer[], now = Date.now()) {
  return offers
    .filter((offer) => isActiveOffer(offer, now) && isDurationStillValid(offer, now))
    .sort(byPriorityDesc);
}

export function getPopupOffer(offers: Offer[], now = Date.now()) {
  return (
    getActiveOffers(offers, now).find(
      (offer) => offer.code === null && offer.offer_type === "standard",
    ) ?? null
  );
}

export async function fetchActivePopupOffer(): Promise<Offer | null> {
  const offers = await fetchOffers();
  return getPopupOffer(offers);
}

export async function hasExistingOrders(userId: string): Promise<boolean> {
  const { count, error } = await supabase
    .from("combined_orders")
    .select("order_id", { count: "exact", head: true })
    .eq("user_id", userId);
  if (error) {
    console.warn("hasExistingOrders", error.message);
    return true;
  }
  return (count ?? 0) > 0;
}

export async function getFirstOrderEligible(user: User | null): Promise<boolean> {
  if (!user) return true;
  return !(await hasExistingOrders(user.id));
}

export function hasLiveCountdown(offers: Offer[], now = Date.now()) {
  return getActiveOffers(offers, now).some((offer) => {
    const endsAt = durationEndTime(offer);
    return endsAt !== null && endsAt > now;
  });
}

export function getSoonestCountdownEnd(offers: Offer[], now = Date.now()) {
  const endTimes = getActiveOffers(offers, now)
    .map(durationEndTime)
    .filter((endTime): endTime is number => endTime !== null && endTime > now);
  return endTimes.length ? Math.min(...endTimes) : null;
}

export function findMatchingCodeOffer(offers: Offer[], enteredCode: string, now = Date.now()) {
  const code = normalizeCode(enteredCode);
  if (!code) return null;
  return getActiveOffers(offers, now).find((offer) => normalizeCode(offer.code) === code) ?? null;
}

export function requiresLoggedInAccount(offer: Offer) {
  const title = normalizeCopy(offer.title);
  const description = normalizeCopy(offer.description);
  const accountCopy = `${title} ${description}`;
  return (
    offer.discount_type === "percentage" &&
    Number(offer.discount_value) === 15 &&
    (accountCopy.includes("account") ||
      accountCopy.includes("sign up") ||
      accountCopy.includes("signup") ||
      offer.first_order_only === true)
  );
}

function getGeneratedArabicOfferCopy(offer: Offer) {
  const copy = `${normalizeCopy(offer.title)} ${normalizeCopy(offer.description)}`;

  if (requiresLoggedInAccount(offer)) {
    return {
      title: "أنشئ حساباً واحصل على خصم 15٪ على أول قطعة",
      description: "العملاء الجدد يحصلون على خصم 15٪ على أول قطعة عند إنشاء حساب.",
    };
  }

  if (offer.discount_type === "free_shipping" || copy.includes("free shipping")) {
    return {
      title: "شحن مجاني",
      description: offer.minimum_order_egp
        ? `شحن مجاني للطلبات من ${money(offer.minimum_order_egp).toLocaleString("en-US")} جنيه.`
        : "استمتع بشحن مجاني على طلبك.",
    };
  }

  if (offer.discount_type === "percentage" && offer.discount_value !== null) {
    return {
      title: `خصم ${money(offer.discount_value)}٪`,
      description: offer.minimum_order_egp
        ? `يسري على الطلبات من ${money(offer.minimum_order_egp).toLocaleString("en-US")} جنيه.`
        : "يسري على المنتجات المؤهلة.",
    };
  }

  if (offer.discount_type === "fixed" && offer.discount_value !== null) {
    return {
      title: `خصم ${money(offer.discount_value).toLocaleString("en-US")} جنيه`,
      description: offer.minimum_order_egp
        ? `يسري على الطلبات من ${money(offer.minimum_order_egp).toLocaleString("en-US")} جنيه.`
        : "يسري على المنتجات المؤهلة.",
    };
  }

  return null;
}

export function getOfferCopy(offer: Offer, lang: Lang) {
  if (lang !== "ar") {
    return { title: offer.title, description: offer.description };
  }

  const dbTitle = offer.title_ar?.trim();
  const dbDescription = offer.description_ar?.trim();
  if (dbTitle || dbDescription) {
    return {
      title: dbTitle || offer.title,
      description: dbDescription || offer.description,
    };
  }

  return (
    getGeneratedArabicOfferCopy(offer) ?? {
      title: offer.title,
      description: offer.description,
    }
  );
}

export function calculateOfferTotals(
  offers: Offer[],
  subtotal: number,
  baseShippingFee: number,
  options: OfferEligibilityOptions,
  now = Date.now(),
): OfferTotals {
  const enteredCode = normalizeCode(options.enteredCode);
  let runningSubtotal = money(subtotal);
  let shippingFee = money(baseShippingFee);
  const appliedOffers: AppliedOffer[] = [];

  for (const offer of getActiveOffers(offers, now)) {
    if (requiresLoggedInAccount(offer) && !options.user) continue;
    if (requiresLoggedInAccount(offer) && !options.firstOrderEligible) continue;
    if (offer.first_order_only && !options.firstOrderEligible) continue;

    const offerCode = normalizeCode(offer.code);
    if (offerCode && offerCode !== enteredCode) continue;

    const minimum = offer.minimum_order_egp;
    if (minimum !== null && minimum !== undefined && runningSubtotal < minimum) continue;

    const beforeSubtotal = runningSubtotal;
    let savedEgp = 0;
    let freeShipping = false;

    if (offer.discount_type === "percentage") {
      savedEgp = money((runningSubtotal * (offer.discount_value ?? 0)) / 100);
      runningSubtotal = money(runningSubtotal - savedEgp);
    } else if (offer.discount_type === "fixed") {
      savedEgp = Math.min(runningSubtotal, money(offer.discount_value ?? 0));
      runningSubtotal = money(runningSubtotal - savedEgp);
    } else if (offer.discount_type === "free_shipping") {
      savedEgp = shippingFee;
      shippingFee = 0;
      freeShipping = true;
    } else {
      continue;
    }

    if (savedEgp <= 0 && !freeShipping) continue;

    appliedOffers.push({
      offer,
      savedEgp,
      subtotalBefore: beforeSubtotal,
      subtotalAfter: runningSubtotal,
      freeShipping,
    });
  }

  const discountTotal = appliedOffers.reduce((sum, applied) => sum + applied.savedEgp, 0);
  return {
    appliedOffers,
    subtotalAfterDiscounts: runningSubtotal,
    shippingFee,
    discountTotal,
    total: money(runningSubtotal + shippingFee),
  };
}

export async function incrementOfferUses(offerIds: string[]) {
  const ids = Array.from(new Set(offerIds)).filter(Boolean);
  if (!ids.length) return;
  const { error } = await supabase.rpc("increment_offer_uses", { offer_ids: ids });
  if (error) throw new Error("Could not update offer usage: " + error.message);
}
