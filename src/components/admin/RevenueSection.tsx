import { monthLabel } from "@/components/admin/admin-utils";
import { SectionCard } from "@/components/admin/AdminUi";
import type { RevenueRow } from "@/components/admin/types";
import { formatPrice } from "@/lib/supabase";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function RevenueSection({ revenue }: { revenue: RevenueRow[] }) {
  return (
    <SectionCard eyebrow="Revenue" title="Monthly revenue">
      <div className="border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Month</TableHead>
              <TableHead className="text-right">Revenue</TableHead>
              <TableHead className="text-right">Paid orders</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {revenue.map((row) => (
              <TableRow key={row.month_start}>
                <TableCell>{monthLabel(row.month_start)}</TableCell>
                <TableCell className="text-right">
                  {formatPrice(Number(row.total_revenue_egp || 0))}
                </TableCell>
                <TableCell className="text-right">{row.paid_order_count}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </SectionCard>
  );
}
