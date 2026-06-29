import { useEffect, useState } from "react";
import { formatPrice } from "@/lib/supabase";
import { getSoonestCountdownEnd, type Offer } from "@/lib/offer";
import { useI18n } from "@/lib/i18n";

type Props = {
  offers: Offer[];
  label?: string;
  onExpire?: () => void;
};

function parts(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return { days, hours, minutes, seconds };
}

export function OfferCountdown({ offers, label = "Offer ends in", onExpire }: Props) {
  const { lang } = useI18n();
  const [now, setNow] = useState(Date.now());
  const endsAt = getSoonestCountdownEnd(offers, now);

  useEffect(() => {
    if (!endsAt) return;
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [endsAt]);

  useEffect(() => {
    if (endsAt !== null && endsAt <= now) onExpire?.();
  }, [endsAt, now, onExpire]);

  if (!endsAt || endsAt <= now) return null;

  const remaining = parts(endsAt - now);
  const cells = [
    [lang === "ar" ? "يوم" : "Days", remaining.days],
    [lang === "ar" ? "ساعة" : "Hours", remaining.hours],
    [lang === "ar" ? "دقيقة" : "Min", remaining.minutes],
    [lang === "ar" ? "ثانية" : "Sec", remaining.seconds],
  ] as const;

  return (
    <div
      style={{
        border: "1px solid #fff",
        padding: "14px 16px",
        background: "#000",
        color: "#fff",
      }}
    >
      <div className="jb-eyebrow" style={{ color: "#fff" }}>{label}</div>
      <div className="grid grid-cols-4 gap-2 mt-3">
        {cells.map(([unit, value]) => (
          <div key={unit} style={{ border: "1px solid #262626", padding: "10px 6px", textAlign: "center" }}>
            <div style={{ fontSize: 18, color: "#fff", fontVariantNumeric: "tabular-nums" }}>
              {String(value).padStart(2, "0")}
            </div>
            <div style={{ marginTop: 4, fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "#9a9a9a" }}>
              {unit}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AppliedOfferLine({ title, amount }: { title: string; amount: number }) {
  return (
    <div className="flex justify-between" style={{ fontSize: 13, color: "#fff", padding: "4px 0", gap: 16 }}>
      <span>{title}</span>
      <span style={{ color: "#fff", whiteSpace: "nowrap" }}>- {formatPrice(amount)}</span>
    </div>
  );
}
