import { monthLabel } from "@/components/admin/admin-utils";
import { EmptyState, Section } from "@/components/admin/AdminUi";
import type { RevenueRow } from "@/components/admin/types";
import { formatPrice } from "@/lib/supabase";

export function RevenueSection({ revenue }: { revenue: RevenueRow[] }) {
  const rows = [...revenue].reverse();
  const peak = Math.max(1, ...revenue.map((row) => Number(row.total_revenue_egp || 0)));

  return (
    <Section
      eyebrow="Revenue"
      title="Monthly revenue"
      description="Most recent month first. Bars are relative to the best month."
      bodyClassName="p-0"
    >
      {rows.length === 0 ? (
        <EmptyState
          title="No revenue yet"
          description="Months appear here once orders are marked paid."
        />
      ) : (
        <ul>
          {rows.map((row) => {
            const total = Number(row.total_revenue_egp || 0);
            return (
              <li key={row.month_start} className="border-b px-5 py-4 last:border-b-0 sm:px-6">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <span className="text-sm">{monthLabel(row.month_start)}</span>
                  <span className="text-sm tabular-nums">{formatPrice(total)}</span>
                </div>
                <div className="mt-2.5 h-0.5 w-full bg-[var(--jb-product-bg)]" role="presentation">
                  <div
                    className="h-0.5 bg-foreground"
                    style={{ width: `${Math.max(2, (total / peak) * 100)}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-muted-foreground tabular-nums">
                  {row.paid_order_count} paid order{row.paid_order_count === 1 ? "" : "s"}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </Section>
  );
}
