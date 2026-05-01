import {
  AUTH_SESSION_EVENT,
  clearAuthSession,
  getAuthToken,
  getAuthUser,
  setAuthSession,
  setAuthUser,
  type AuthUser,
} from "@/lib/auth-session";

describe("auth-session", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("stores a normalized permission matrix when setting the session", () => {
    const user: AuthUser = {
      id: 1,
      name: "Admin User",
      email: "admin@rpg.com",
      role: "admin",
      permissions: {
        sales: ["READ", "update"],
      } as never,
    };

    setAuthSession("token-123", user);

    expect(getAuthToken()).toBe("token-123");
    expect(getAuthUser()?.permissions?.sales).toEqual(["read", "update"]);
    expect(getAuthUser()?.permissions?.dashboard).toEqual([]);
  });

  it("updates the stored user without replacing the token", () => {
    const listener = vi.fn();
    window.addEventListener(AUTH_SESSION_EVENT, listener);

    setAuthSession("token-123", {
      id: 1,
      name: "Admin User",
      email: "admin@rpg.com",
      role: "admin",
      permissions: { dashboard: ["read"] } as never,
    });

    setAuthUser({
      id: 1,
      name: "Admin User",
      email: "admin@rpg.com",
      role: "admin",
      permissions: { sales: ["read"] } as never,
    });

    expect(getAuthToken()).toBe("token-123");
    expect(getAuthUser()?.permissions?.sales).toEqual(["read"]);
    expect(getAuthUser()?.permissions?.dashboard).toEqual([]);
    expect(listener).toHaveBeenCalledTimes(2);

    window.removeEventListener(AUTH_SESSION_EVENT, listener);
  });

  it("clears session state cleanly", () => {
    setAuthSession("token-123", {
      id: 1,
      name: "Admin User",
      email: "admin@rpg.com",
      role: "admin",
      permissions: {} as never,
    });

    clearAuthSession();

    expect(getAuthToken()).toBeNull();
    expect(getAuthUser()).toBeNull();
  });
});
