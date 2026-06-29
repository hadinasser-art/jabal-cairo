import { toast } from "sonner";

const TOAST_ID = "jabal-added-to-bag";

export function notifyAddedToBag(opts: {
  name: string;
  size?: string | null;
  color?: string | null;
  onView: () => void;
  t: (k: string) => string;
}) {
  toast.custom(
    (id) => (
      <div className="jabal-bag-toast-inner">
        <button
          type="button"
          aria-label="Close"
          onClick={() => toast.dismiss(id)}
          style={{
            position: "absolute",
            top: -2,
            right: -2,
            width: 24,
            height: 24,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            background: "transparent",
            border: 0,
            color: "#fff",
            fontSize: 18,
            lineHeight: 1,
            cursor: "pointer",
          }}
        >
          ×
        </button>
        <div
          style={{
            fontSize: 11,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "#9a9a9a",
            marginBottom: 6,
          }}
        >
          {opts.t("toast.added")}
        </div>
        <div style={{ fontSize: 14, color: "#fff", fontWeight: 500 }}>{opts.name}</div>
        {(opts.size || opts.color) && (
          <div
            style={{
              fontSize: 11,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              color: "#9a9a9a",
              marginTop: 4,
            }}
          >
            {[opts.size, opts.color].filter(Boolean).join(" · ")}
          </div>
        )}
        <button
          onClick={() => {
            opts.onView();
            toast.dismiss(id);
          }}
          style={{
            marginTop: 14,
            width: "100%",
            background: "#fff",
            color: "#000",
            border: "1px solid #fff",
            padding: "10px 14px",
            fontSize: 11,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            cursor: "pointer",
          }}
        >
          {opts.t("toast.view")}
        </button>
      </div>
    ),
    {
      id: TOAST_ID,
      duration: 5000,
      className: "jabal-bag-toast",
      style: { width: "min(360px, calc(100vw - 32px))" },
    },
  );
}
