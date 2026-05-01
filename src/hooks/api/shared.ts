import { getAuthToken } from "@/lib/auth-session";

export function getRequiredToken(): string {
  const token = getAuthToken();
  if (!token) {
    throw new Error("Authentication required");
  }
  return token;
}

export function toErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}
