import { useState, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import {
  ArrowUpRight,
  Boxes,
  Images,
  LayoutGrid,
  LogOut,
  Menu,
  Package,
  RefreshCw,
  Star,
  TrendingUp,
} from "lucide-react";
import type { AdminSection } from "@/components/admin/types";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/lib/auth";
import { JABAL_LOGO_URL } from "@/lib/supabase";
import { cn } from "@/lib/utils";

type NavItem = {
  section: AdminSection;
  label: string;
  icon: LucideIcon;
};

const NAV_ITEMS: NavItem[] = [
  { section: "overview", label: "Overview", icon: LayoutGrid },
  { section: "orders", label: "Orders", icon: Package },
  { section: "inventory", label: "Inventory", icon: Boxes },
  { section: "photos", label: "Photos", icon: Images },
  { section: "reviews", label: "Reviews", icon: Star },
  { section: "revenue", label: "Revenue", icon: TrendingUp },
];

export type AdminNavCounts = Partial<Record<AdminSection, number>>;

/** The logo asset is dark artwork, so it needs inverting on the black chrome. */
const LOGO_INVERT = { filter: "invert(1) brightness(2)" } as const;

function sectionLabel(section: AdminSection) {
  return NAV_ITEMS.find((item) => item.section === section)?.label ?? "Overview";
}

/** Full-bleed admin chrome. Replaces the storefront Layout so the dashboard gets the whole viewport. */
export function AdminLayout({
  section,
  counts,
  email,
  refreshing,
  onSectionChange,
  onRefresh,
  children,
}: {
  section: AdminSection;
  counts: AdminNavCounts;
  email: string;
  refreshing: boolean;
  onSectionChange: (section: AdminSection) => void;
  onRefresh: () => void;
  children: ReactNode;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  const selectSection = (next: AdminSection) => {
    onSectionChange(next);
    setMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-background text-foreground lg:grid lg:grid-cols-[15rem_1fr]">
      <aside className="sticky top-0 hidden h-screen flex-col border-e lg:flex">
        <SidebarBody section={section} counts={counts} email={email} onSelect={selectSection} />
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b bg-background/95 px-4 py-3 backdrop-blur sm:px-6 lg:px-8">
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <Button type="button" variant="outline" size="icon" className="lg:hidden">
                <Menu aria-hidden="true" />
                <span className="sr-only">Open admin menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 border-e p-0 sm:max-w-xs">
              <SheetTitle className="sr-only">Admin navigation</SheetTitle>
              <SidebarBody
                section={section}
                counts={counts}
                email={email}
                onSelect={selectSection}
              />
            </SheetContent>
          </Sheet>

          <h1 className="min-w-0 flex-1 truncate text-base font-light tracking-tight">
            {sectionLabel(section)}
          </h1>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={cn("size-4", refreshing && "animate-spin")} aria-hidden="true" />
            <span className="hidden sm:inline">{refreshing ? "Refreshing" : "Refresh"}</span>
          </Button>
        </header>

        <main className="min-w-0 flex-1 p-4 pb-16 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

function SidebarBody({
  section,
  counts,
  email,
  onSelect,
}: {
  section: AdminSection;
  counts: AdminNavCounts;
  email: string;
  onSelect: (section: AdminSection) => void;
}) {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="flex h-full flex-col bg-[var(--jb-bg-warm)]">
      <div className="flex h-[57px] shrink-0 items-center gap-3 border-b px-5">
        <img src={JABAL_LOGO_URL} alt="JABAL" className="h-5 w-auto" style={LOGO_INVERT} />
        <span className="jb-eyebrow">Admin</span>
      </div>

      <nav aria-label="Admin sections" className="flex-1 overflow-y-auto py-3">
        {NAV_ITEMS.map((item) => {
          const active = item.section === section;
          const count = counts[item.section] ?? 0;
          return (
            <button
              key={item.section}
              type="button"
              onClick={() => onSelect(item.section)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex w-full items-center gap-3 border-s-2 px-4 py-2.5 text-start text-sm transition-colors",
                active
                  ? "border-s-foreground bg-[var(--jb-product-bg)] text-foreground"
                  : "border-s-transparent text-muted-foreground hover:bg-[var(--jb-product-bg)]/60 hover:text-foreground",
              )}
            >
              <item.icon className="size-4 shrink-0" strokeWidth={1.7} aria-hidden="true" />
              <span className="flex-1 truncate">{item.label}</span>
              {count > 0 && (
                <span className="min-w-5 border px-1.5 py-0.5 text-center text-[10px] tabular-nums text-muted-foreground">
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="shrink-0 border-t px-4 py-4">
        <p className="truncate text-xs text-muted-foreground" title={email}>
          {email}
        </p>
        <div className="mt-3 flex flex-col gap-1">
          <Link
            to="/"
            className="flex items-center gap-2 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowUpRight className="size-3.5" aria-hidden="true" />
            View store
          </Link>
          <button
            type="button"
            onClick={() => void signOut().then(() => navigate({ to: "/" }))}
            className="flex items-center gap-2 py-1 text-start text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <LogOut className="size-3.5" aria-hidden="true" />
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}

/** Minimal centered chrome for the loading and access-denied states. */
export function AdminGate({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-16 text-foreground">
      <div className="w-full max-w-md">
        <img src={JABAL_LOGO_URL} alt="JABAL" className="mx-auto h-6 w-auto" style={LOGO_INVERT} />
        <div className="mt-8">{children}</div>
      </div>
    </div>
  );
}
