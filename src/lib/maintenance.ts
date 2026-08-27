export const MAINTENANCE_MODE = import.meta.env.VITE_MAINTENANCE_MODE !== "false";

const MAINTENANCE_AUTH_PATHS = new Set(["/login", "/forgot", "/reset-password", "/auth/callback"]);

function normalizePathname(pathname: string) {
  return pathname.replace(/\/+$/, "") || "/";
}

export function isMaintenanceAuthPath(pathname: string) {
  return MAINTENANCE_AUTH_PATHS.has(normalizePathname(pathname));
}

export function isMaintenanceStatusBypassPath(pathname: string) {
  const normalized = normalizePathname(pathname);
  return normalized === "/admin" || MAINTENANCE_AUTH_PATHS.has(normalized);
}

export const maintenanceDestination = MAINTENANCE_MODE ? "/admin" : "/account";
