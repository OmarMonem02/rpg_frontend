import { getApiUrl } from "@/lib/config";
import type { AuthUser } from "@/lib/auth-session";
import { normalizeOptionalPermissionMatrix } from "@/lib/permissions";

export type LoginPayload = {
  email: string;
  password: string;
  device_name?: string;
};

export type LoginResponse = {
  token: string;
  user: AuthUser;
};

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function parseErrorMessage(response: Response): Promise<string> {
  try {
    const json = (await response.json()) as { message?: string };
    if (json.message) return json.message;
  } catch {
    // Ignore parse errors and use fallback message.
  }

  if (response.status === 401) return "Your session expired. Please log in again.";
  if (response.status === 422) return "Invalid credentials.";
  return "Request failed. Please try again.";
}

async function parseJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

function normalizeAuthUser(raw: unknown): AuthUser {
  const record =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};

  return {
    id: typeof record.id === "number" ? record.id : Number(record.id ?? 0),
    name: typeof record.name === "string" ? record.name : "",
    email: typeof record.email === "string" ? record.email : "",
    role: typeof record.role === "string" ? record.role : "",
    permissions: normalizeOptionalPermissionMatrix(record.permissions),
  };
}

export async function login(payload: LoginPayload): Promise<LoginResponse> {
  const response = await fetch(getApiUrl("/login"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      ...payload,
      device_name: payload.device_name ?? "web",
    }),
  });

  if (!response.ok) {
    throw new ApiError(await parseErrorMessage(response), response.status);
  }

  const data = await parseJson<LoginResponse>(response);
  return {
    token: data.token,
    user: normalizeAuthUser(data.user),
  };
}

export async function getMe(token: string): Promise<AuthUser> {
  const response = await fetch(getApiUrl("/me"), {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new ApiError(await parseErrorMessage(response), response.status);
  }

  const data = await parseJson<{ user: AuthUser }>(response);
  return normalizeAuthUser(data.user);
}

export async function logout(token: string): Promise<void> {
  const response = await fetch(getApiUrl("/logout"), {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new ApiError(await parseErrorMessage(response), response.status);
  }
}
