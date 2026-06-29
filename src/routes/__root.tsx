import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { CartProvider } from "../lib/cart";
import { I18nProvider } from "../lib/i18n";
import { AuthProvider } from "../lib/auth";
import { OfferPopup } from "../components/OfferPopup";
import { JABAL_LOGO_URL } from "../lib/supabase";
import { Toaster } from "sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-black px-4 text-white">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-light">404</h1>
        <h2 className="mt-4 text-xl">Page not found</h2>
        <div className="mt-6">
          <Link to="/" className="jb-btn">Go home</Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-black px-4 text-white">
      <div className="max-w-md text-center">
        <h1 className="text-xl">This page didn't load</h1>
        <div className="mt-6">
          <button onClick={() => { router.invalidate(); reset(); }} className="jb-btn">Try again</button>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "JABAL — Premium Fashion from Cairo" },
      { name: "description", content: "JABAL — premium minimal fashion from Cairo." },
      { property: "og:title", content: "JABAL — Premium Fashion from Cairo" },
      { property: "og:description", content: "Premium minimal fashion from Cairo." },
      { property: "og:image", content: JABAL_LOGO_URL },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: JABAL_LOGO_URL },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: JABAL_LOGO_URL, type: "image/png" },
      { rel: "apple-touch-icon", href: JABAL_LOGO_URL },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <AuthProvider>
          <CartProvider>
            <Outlet />
            <OfferPopup />
            <Toaster position="top-right" theme="dark" />
          </CartProvider>
        </AuthProvider>
      </I18nProvider>
    </QueryClientProvider>
  );
}
