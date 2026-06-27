import { toast } from "sonner";

export function notifyAddedToBag(opts: {
  name: string;
  size?: string | null;
  color?: string | null;
  onView: () => void;
}) {
  toast.custom(
    (id) => (
      <div style={{ minWidth: 320, maxWidth: 380 }}>
        <div
          style={{
            fontSize: 11,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "#555",
            marginBottom: 6,
          }}
        >
          Added to bag
        </div>
        <div style={{ fontSize: 14, color: "#111", fontWeight: 500 }}>{opts.name}</div>
        {(opts.size || opts.color) && (
          <div
            style={{
              fontSize: 11,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              color: "#555",
              marginTop: 4,
            }}
          >
            {[opts.size, opts.color].filter(Boolean).join(" · ")}
          </div>
        )}
        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          <button
            onClick={() => {
              opts.onView();
              toast.dismiss(id);
            }}
            style={{
              flex: 1,
              background: "#111",
              color: "#fff",
              border: "1px solid #111",
              padding: "10px 14px",
              fontSize: 11,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              cursor: "pointer",
            }}
          >
            View bag
          </button>
          <button
            onClick={() => toast.dismiss(id)}
            style={{
              flex: 1,
              background: "#fff",
              color: "#111",
              border: "1px solid #111",
              padding: "10px 14px",
              fontSize: 11,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              cursor: "pointer",
            }}
          >
            Continue
          </button>
        </div>
      </div>
    ),
    { duration: 5000 },
  );
}
