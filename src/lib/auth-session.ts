import {
  normalizeOptionalPermissionMatrix,
  type PermissionMatrix,
} from "@/lib/permissions";

export type AuthUser = {
  id: number;
  name: string;
  email: string;
  role: string;
  permissions?: PermissionMatrix;
};

const TOKEN_KEY = "rpg_auth_token";
const USER_KEY = "rpg_auth_user";
export const AUTH_SESSION_EVENT = "rpg-auth-session-change";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function emitSessionChange(): void {
  if (!isBrowser()) return;
  window.dispatchEvent(new Event(AUTH_SESSION_EVENT));
}

function normalizeAuthUser(user: AuthUser): AuthUser {
  return {
    id: typeof user.id === "number" ? user.id : Number(user.id ?? 0),
    name: typeof user.name === "string" ? user.name : "",
    email: typeof user.email === "string" ? user.email : "",
    role: typeof user.role === "string" ? user.role : "",
    permissions: normalizeOptionalPermissionMatrix(user.permissions),
  };
}

export function getAuthToken(): string | null {
  if (!isBrowser()) return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setAuthSession(token: string, user: AuthUser): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(TOKEN_KEY, token);
  window.localStorage.setItem(USER_KEY, JSON.stringify(normalizeAuthUser(user)));
  emitSessionChange();
}

export function setAuthUser(user: AuthUser): void {
  if (!isBrowser()) return;
  if (!getAuthToken()) return;

  window.localStorage.setItem(USER_KEY, JSON.stringify(normalizeAuthUser(user)));
  emitSessionChange();
}

export function getAuthUser(): AuthUser | null {
  if (!isBrowser()) return null;

  const rawUser = window.localStorage.getItem(USER_KEY);
  if (!rawUser) return null;

  try {
    return normalizeAuthUser(JSON.parse(rawUser) as AuthUser);
  } catch {
    clearAuthSession();
    return null;
  }
}

export function clearAuthSession(): void {
  if (!isBrowser()) return;
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
  emitSessionChange();
}
