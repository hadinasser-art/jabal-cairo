import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { fetchOffers, getActiveOffers, getFirstOrderEligible, durationEndTime, type Offer } from "@/lib/offer";
import { useI18n } from "@/lib/i18n";

type Props = {
  user: User | null;
};

function formatRemaining(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function OfferTopBar({ user }: Props) {
  const { lang, t, dir } = useI18n();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [firstOrderEligible, setFirstOrderEligible] = useState(true);
  const [now, setNow] = useState(Date.now());
  const [activeIndex, setActiveIndex] = useState(0);
  const startX = useRef<number | null>(null);

  useEffect(() => { fetchOffers().then(setOffers); }, []);

  useEffect(() => {
    let cancelled = false;
    getFirstOrderEligible(user).then((eligible) => {
      if (!cancelled) setFirstOrderEligible(eligible);
    });
    return () => { cancelled = true; };
  }, [user]);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  const visibleOffers = useMemo(() => (
    getActiveOffers(offers, now).filter((candidate) => !candidate.first_order_only || firstOrderEligible)
  ), [offers, firstOrderEligible, now]);

  useEffect(() => {
    setActiveIndex(0);
  }, [visibleOffers.length]);

  useEffect(() => {
    if (visibleOffers.length <= 1) return;
    const interval = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % visibleOffers.length);
    }, 5000);
    return () => window.clearInterval(interval);
  }, [visibleOffers.length]);

  const offer = visibleOffers[activeIndex] ?? visibleOffers[0] ?? null;

  if (!offer) return null;

  const goTo = (index: number) => {
    const count = visibleOffers.length;
    if (!count) return;
    setActiveIndex((index + count) % count);
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    startX.current = e.clientX;
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (startX.current === null || visibleOffers.length <= 1) return;
    const delta = e.clientX - startX.current;
    startX.current = null;
    if (Math.abs(delta) < 36) return;
    const direction = dir === "rtl" ? -1 : 1;
    goTo(activeIndex + (delta < 0 ? direction : -direction));
  };

  return (
    <div
      style={{
        minHeight: 68,
        background: "#fff",
        color: "#000",
        borderBottom: "1px solid #fff",
        overflow: "hidden",
      }}
    >
      <div
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        style={{
          direction: "ltr",
          cursor: visibleOffers.length > 1 ? "grab" : "default",
          touchAction: "pan-y",
        }}
      >
        <div
          style={{
            display: "flex",
            transform: `translateX(-${activeIndex * 100}%)`,
            transition: "transform 420ms cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        >
          {visibleOffers.map((visibleOffer, index) => {
            const endsAt = durationEndTime(visibleOffer);
            const remaining = endsAt && endsAt > now ? formatRemaining(endsAt - now) : null;

            return (
              <div
                key={visibleOffer.id}
                className="px-4 md:px-10"
                aria-hidden={index !== activeIndex}
                style={{
                  minHeight: visibleOffers.length > 1 ? 58 : 44,
                  flex: "0 0 100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 14,
                  flexWrap: "wrap",
                  textAlign: "center",
                  fontSize: 11,
                  letterSpacing: lang === "ar" ? 0 : "0.1em",
                  textTransform: "uppercase",
                  lineHeight: 1.4,
                  paddingTop: 9,
                  paddingBottom: visibleOffers.length > 1 ? 4 : 9,
                  direction: dir,
                }}
              >
                {visibleOffers.length > 1 && (
                  <span style={{ color: "#555", fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>
                    {index + 1}/{visibleOffers.length}
                  </span>
                )}
                <span style={{ fontWeight: 700 }}>{visibleOffer.title}</span>
                {visibleOffer.description && (
                  <span style={{ color: "#333", letterSpacing: lang === "ar" ? 0 : "0.04em", textTransform: "none" }}>
                    {visibleOffer.description}
                  </span>
                )}
                {visibleOffer.code && (
                  <span style={{ border: "1px solid #000", padding: "3px 8px", fontWeight: 700 }}>
                    {t("offer.code")} {visibleOffer.code}
                  </span>
                )}
                {remaining && (
                  <span style={{ fontVariantNumeric: "tabular-nums", fontWeight: 700 }}>
                    {t("offer.ends")} {remaining}
                  </span>
                )}
                <Link to="/shop" style={{ color: "#000", textDecoration: "underline", textUnderlineOffset: 3, fontWeight: 700 }}>
                  {t("offer.shop")}
                </Link>
              </div>
            );
          })}
        </div>
      </div>

      {visibleOffers.length > 1 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, height: 10, paddingBottom: 8 }}>
            {visibleOffers.map((visibleOffer, index) => (
              <button
                key={visibleOffer.id}
                type="button"
                aria-label={`${t("offer.show")} ${index + 1}: ${visibleOffer.title}`}
                onClick={() => goTo(index)}
                style={{
                  width: index === activeIndex ? 14 : 6,
                  height: 6,
                  borderRadius: 999,
                  border: "1px solid #000",
                  background: index === activeIndex ? "#000" : "transparent",
                  padding: 0,
                  cursor: "pointer",
                  transition: "width 180ms ease, background 180ms ease",
                }}
              />
            ))}
        </div>
      )}
    </div>
  );
}
