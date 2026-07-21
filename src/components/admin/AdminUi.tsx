import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { statusBadgeClass, statusLabel } from "@/components/admin/admin-utils";

export function AdminShell({ children }: { children: ReactNode }) {
  return <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 md:px-10 md:py-12">{children}</main>;
}

export function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Card className="min-h-28 rounded-none bg-background shadow-none">
      <CardHeader className="p-4 pb-0">
        <p className="jb-eyebrow">{label}</p>
      </CardHeader>
      <CardContent className="p-4 pt-3 text-2xl font-light text-foreground">{value}</CardContent>
    </Card>
  );
}

export function SectionCard({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <Card className="rounded-none bg-background shadow-none">
      <CardHeader className="p-4 sm:p-6">
        <p className="jb-eyebrow">{eyebrow}</p>
        <CardTitle className="text-lg font-normal">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">{children}</CardContent>
    </Card>
  );
}

export function Pager({
  page,
  pageCount,
  total,
  itemLabel = "orders",
  onPrevious,
  onNext,
}: {
  page: number;
  pageCount: number;
  total: number;
  itemLabel?: string;
  onPrevious: () => void;
  onNext: () => void;
}) {
  if (pageCount <= 1) return null;
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
      <span>
        Page {page} of {pageCount} · {total} {itemLabel}
      </span>
      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={onPrevious} disabled={page <= 1}>
          Previous
        </Button>
        <Button type="button" variant="outline" onClick={onNext} disabled={page >= pageCount}>
          Next
        </Button>
      </div>
    </div>
  );
}

export function StatusBadge({ value, kind }: { value: string; kind: "payment" | "order" }) {
  return (
    <Badge variant="outline" className={statusBadgeClass(value, kind)}>
      {statusLabel(value)}
    </Badge>
  );
}
