import type { ReactNode } from "react";
import { Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { statusBadgeClass, statusLabel } from "@/components/admin/admin-utils";
import { cn } from "@/lib/utils";

/** Hairline surface every admin block sits on. One definition, reused everywhere. */
export function Panel({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("border bg-[var(--jb-bg-warm)]", className)}>{children}</div>;
}

export function Section({
  eyebrow,
  title,
  description,
  actions,
  bodyClassName,
  children,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  bodyClassName?: string;
  children: ReactNode;
}) {
  return (
    <Panel>
      <header className="flex flex-wrap items-end justify-between gap-4 border-b px-5 py-4 sm:px-6">
        <div className="min-w-0">
          <p className="jb-eyebrow">{eyebrow}</p>
          <h2 className="mt-1.5 text-lg font-light tracking-tight">{title}</h2>
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        </div>
        {actions}
      </header>
      <div className={cn("p-5 sm:p-6", bodyClassName)}>{children}</div>
    </Panel>
  );
}

export function Metric({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "attention";
}) {
  return (
    <Panel className="p-5">
      <p className="jb-eyebrow">{label}</p>
      <p
        className={cn(
          "mt-3 text-2xl font-light tabular-nums",
          tone === "attention" && "text-[#f4dda0]",
        )}
      >
        {value}
      </p>
      {hint && <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p>}
    </Panel>
  );
}

export function SearchField({
  id,
  label,
  value,
  placeholder,
  onChange,
  className,
}: {
  id: string;
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <label className="sr-only" htmlFor={id}>
        {label}
      </label>
      <Search
        className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <Input
        id={id}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="ps-9"
      />
    </div>
  );
}

export type FilterOption = { value: string; label: string; count?: number };

/** Shared status filter row — replaces the per-section Tabs strips. */
export function FilterChips({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: FilterOption[];
  onChange: (value: string) => void;
}) {
  return (
    <div role="group" aria-label={label}>
      <p className="jb-eyebrow">{label}</p>
      <div className="mt-2 -mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
        {options.map((option) => {
          const active = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(option.value)}
              className={cn(
                "shrink-0 border px-3 py-1.5 text-xs capitalize transition-colors",
                active
                  ? "border-foreground bg-foreground text-background"
                  : "text-muted-foreground hover:border-foreground/40 hover:text-foreground",
              )}
            >
              {option.label}
              {option.count !== undefined && (
                <span className={cn("ms-1.5 tabular-nums", !active && "text-muted-foreground/60")}>
                  {option.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5 px-6 py-14 text-center">
      <p className="text-sm">{title}</p>
      {description && <p className="max-w-sm text-sm text-muted-foreground">{description}</p>}
    </div>
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
    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
      <span className="tabular-nums">
        Page {page} of {pageCount} · {total} {itemLabel}
      </span>
      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onPrevious} disabled={page <= 1}>
          Previous
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onNext}
          disabled={page >= pageCount}
        >
          Next
        </Button>
      </div>
    </div>
  );
}

export function StatusBadge({ value, kind }: { value: string; kind: "payment" | "order" }) {
  return (
    <Badge variant="outline" className={cn("capitalize", statusBadgeClass(value, kind))}>
      {statusLabel(value)}
    </Badge>
  );
}
