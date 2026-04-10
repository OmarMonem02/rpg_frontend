"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError, getMe, login } from "@/lib/auth-api";
import { clearAuthSession, getAuthToken, setAuthSession } from "@/lib/auth-session";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;

    async function checkSession() {
      const token = getAuthToken();
      if (!token) return;

      try {
        const user = await getMe(token);
        if (active) {
          setAuthSession(token, user);
          router.replace("/");
        }
      } catch {
        clearAuthSession();
      }
    }

    checkSession();
    return () => {
      active = false;
    };
  }, [router]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setIsLoading(true);

    try {
      const response = await login({
        email: email.trim(),
        password,
        device_name: "web",
      });

      setAuthSession(response.token, response.user);
      router.replace("/");
    } catch (error) {
      if (error instanceof ApiError) {
        setMessage(error.message);
      } else {
        setMessage("Unable to login right now. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="glass ghost-border w-full max-w-md rounded-md border p-6 shadow-ambient">
        <h1 className="text-2xl font-bold text-on-surface">Login</h1>
        <p className="mt-2 text-sm text-on-surface-variant">
          Sign in with your account to continue.
        </p>

        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <div className="space-y-1">
            <label className="text-sm font-medium text-on-surface" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              className="w-full rounded-md border border-outline-variant/40 bg-surface-container-lowest px-3 py-2 text-on-surface outline-none focus:border-primary"
              placeholder="admin@rpg.hub"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-on-surface" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              className="w-full rounded-md border border-outline-variant/40 bg-surface-container-lowest px-3 py-2 text-on-surface outline-none focus:border-primary"
              placeholder="••••••••"
            />
          </div>

          {message ? (
            <p className="rounded-md bg-error-container px-3 py-2 text-sm text-on-error-container">
              {message}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-md bg-primary px-4 py-2 font-semibold text-on-primary transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? "Signing in..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
}
