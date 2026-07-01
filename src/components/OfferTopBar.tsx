import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import {
  fetchOffers,
  getActiveOffers,
  getOfferCopy,
  getFirstOrderEligible,
  requiresLoggedInAccount,
  durationEndTime,
  type Offer,
} from "@/lib/offer";
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

  useEffect(() => {
    fetchOffers().then(setOffers);
  }, []);

  useEffect(() => {
    let cancelled = false;
    getFirstOrderEligible(user).then((eligible) => {
      if (!cancelled) setFirstOrderEligible(eligible);
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  const visibleOffers = useMemo(
    () =>
      getActiveOffers(offers, now).filter((candidate) => {
        if (requiresLoggedInAccount(candidate)) return !user || firstOrderEligible;
        return !candidate.first_order_only || firstOrderEligible;
      }),
    [offers, firstOrderEligible, now, user],
  );

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
            const copy = getOfferCopy(visibleOffer, lang);

            return (
              <div
                key={visibleOffer.id}
                className="px-4 md:px-10"
                aria-hidden={index !== activeIndex}
                style={{
                  minHeight: visibleOffers.length > 1 ? 82 : 74,
                  flex: "0 0 100%",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  textAlign: "center",
                  fontSize: 13,
                  lineHeight: 1.4,
                  paddingTop: 13,
                  paddingBottom: visibleOffers.length > 1 ? 7 : 13,
                  direction: dir,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 10,
                    width: "100%",
                    minWidth: 0,
                  }}
                >
                  {visibleOffers.length > 1 && (
                    <span
                      style={{
                        color: "#555",
                        fontVariantNumeric: "tabular-nums",
                        fontWeight: 700,
                        fontSize: 11,
                        flexShrink: 0,
                      }}
                    >
                      {index + 1}/{visibleOffers.length}
                    </span>
                  )}
                  <span
                    style={{
                      fontWeight: 800,
                      letterSpacing: lang === "ar" ? 0 : "0.14em",
                      textTransform: "uppercase",
                      overflowWrap: "anywhere",
                    }}
                  >
                    {copy.title}
                  </span>
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 16,
                    flexWrap: "wrap",
                    width: "100%",
                    minWidth: 0,
                    color: "#333",
                    letterSpacing: lang === "ar" ? 0 : "0.04em",
                    textTransform: "none",
                  }}
                >
                  {copy.description && (
                    <span style={{ maxWidth: 720, overflowWrap: "anywhere" }}>
                      {copy.description}
                    </span>
                  )}
                  {visibleOffer.code && (
                    <span
                      style={{
                        border: "1px solid #000",
                        padding: "3px 8px",
                        fontWeight: 700,
                        color: "#000",
                      }}
                    >
                      {t("offer.code")} {visibleOffer.code}
                    </span>
                  )}
                  {remaining && (
                    <span
                      style={{ fontVariantNumeric: "tabular-nums", fontWeight: 700, color: "#000" }}
                    >
                      {t("offer.ends")} {remaining}
                    </span>
                  )}
                  <Link
                    to="/shop"
                    style={{
                      color: "#000",
                      textDecoration: "underline",
                      textUnderlineOffset: 3,
                      fontWeight: 800,
                      letterSpacing: lang === "ar" ? 0 : "0.16em",
                      textTransform: "uppercase",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {t("offer.shop")}
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {visibleOffers.length > 1 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            height: 10,
            paddingBottom: 8,
          }}
        >
          {visibleOffers.map((visibleOffer, index) => (
            <button
              key={visibleOffer.id}
              type="button"
              aria-label={`${t("offer.show")} ${index + 1}: ${getOfferCopy(visibleOffer, lang).title}`}
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
