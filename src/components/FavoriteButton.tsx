import { useNavigate } from "@tanstack/react-router";
import { Heart } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { useI18n } from "@/lib/i18n";

type Props = {
  itemId: string;
  itemName: string;
  variantId?: string | null;
  requireVariant?: boolean;
  className?: string;
  showLabel?: boolean;
};

export function FavoriteButton({
  itemId,
  itemName,
  variantId = null,
  requireVariant = false,
  className,
  showLabel = false,
}: Props) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { t } = useI18n();
  const [favoriteId, setFavoriteId] = useState<string | null>(null);
  const [savedVariantId, setSavedVariantId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    setFavoriteId(null);
    setSavedVariantId(null);
    if (loading || !user)
      return () => {
        alive = false;
      };

    supabase
      .from("favorites")
      .select("id,variant_id")
      .eq("user_id", user.id)
      .eq("item_id", itemId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!alive) return;
        if (error) console.warn("favorite status", error.message);
        setFavoriteId(data?.id ?? null);
        setSavedVariantId(data?.variant_id ?? null);
      });

    return () => {
      alive = false;
    };
  }, [itemId, loading, user, variantId]);

  const toggle = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;

    if (!user) {
      toast(t("favorite.loginRequired"));
      navigate({ to: "/login" });
      return;
    }
    if (requireVariant && !variantId) {
      toast(t("favorite.selectVariant"));
      return;
    }

    setBusy(true);
    const sameSavedVariant = favoriteId && savedVariantId === variantId;
    const productLevelToggle = favoriteId && variantId === null && !requireVariant;

    if (sameSavedVariant || productLevelToggle) {
      const { error } = await supabase
        .from("favorites")
        .delete()
        .eq("id", favoriteId)
        .eq("user_id", user.id);
      if (error) toast.error(error.message);
      else {
        setFavoriteId(null);
        setSavedVariantId(null);
        toast(t("favorite.removed"));
      }
    } else if (favoriteId) {
      const { data, error } = await supabase
        .from("favorites")
        .update({ variant_id: variantId })
        .eq("id", favoriteId)
        .eq("user_id", user.id)
        .select("id,variant_id")
        .single();
      if (error) toast.error(error.message);
      else {
        setFavoriteId(data.id);
        setSavedVariantId(data.variant_id ?? null);
        toast(`${itemName} ${t("favorite.updated")}`);
      }
    } else {
      const { data, error } = await supabase
        .from("favorites")
        .insert({ user_id: user.id, item_id: itemId, variant_id: variantId })
        .select("id,variant_id")
        .single();
      if (error) toast.error(error.message);
      else {
        setFavoriteId(data.id);
        setSavedVariantId(data.variant_id ?? null);
        toast(`${itemName} ${t("favorite.added")}`);
      }
    }
    setBusy(false);
  };

  const saved = Boolean(favoriteId && (variantId === null || savedVariantId === variantId));
  const label = saved ? t("favorite.saved") : t("favorite.save");

  return (
    <button
      type="button"
      className={className}
      onClick={toggle}
      disabled={busy || loading}
      aria-pressed={saved}
      aria-label={label}
      title={label}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        minWidth: showLabel ? 0 : 38,
        height: 38,
        padding: showLabel ? "0 14px" : 0,
        border: saved ? "1px solid #fff" : "1px solid #262626",
        background: saved ? "#fff" : "rgba(0,0,0,0.72)",
        color: saved ? "#000" : "#fff",
        cursor: busy || loading ? "wait" : "pointer",
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        fontSize: 11,
      }}
    >
      <Heart
        size={17}
        strokeWidth={1.8}
        fill={saved ? "currentColor" : "none"}
        aria-hidden="true"
      />
      {showLabel && <span>{label}</span>}
    </button>
  );
}
