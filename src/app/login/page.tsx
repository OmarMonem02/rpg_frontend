"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError, getMe, login } from "@/lib/auth-api";
import {
  clearAuthSession,
  getAuthToken,
  setAuthSession,
} from "@/lib/auth-session";

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
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex h-22 w-22 items-center justify-center rounded-xl bg-primary/10 text-primary mb-4 overflow-hidden">
            <img
              src="/logo.ico"
              alt="menu"
              className="w-full h-full object-cover"
            />
          </div>
          <h1 className="text-3xl font-display font-bold text-on-surface">
            RPG Workshop
          </h1>
          <p className="mt-2 text-on-surface-variant font-medium">
            Control Center Authentication
          </p>
        </div>

        <section className="bg-surface-container-lowest border border-outline-variant/20 rounded-3xl p-8 shadow-ambient">
          <form className="space-y-6" onSubmit={onSubmit}>
            <div className="space-y-2">
              <label
                className="text-sm font-semibold text-on-surface ml-1"
                htmlFor="email"
              >
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                className="w-full rounded-2xl border border-outline-variant/30 bg-surface-container-low px-4 py-3.5 text-on-surface outline-none transition-all focus:border-primary focus:bg-surface-container-lowest focus:ring-4 focus:ring-primary/5 placeholder:text-on-surface-variant/40"
                placeholder="admin@rpg.com"
              />
            </div>

            <div className="space-y-2">
              <label
                className="text-sm font-semibold text-on-surface ml-1"
                htmlFor="password"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                className="w-full rounded-2xl border border-outline-variant/30 bg-surface-container-low px-4 py-3.5 text-on-surface outline-none transition-all focus:border-primary focus:bg-surface-container-lowest focus:ring-4 focus:ring-primary/5 placeholder:text-on-surface-variant/40"
                placeholder="••••••••"
              />
            </div>

            {message ? (
              <div className="rounded-2xl border border-error/10 bg-error-container/30 px-4 py-3 text-sm text-error font-medium flex items-center gap-3">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {message}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-2xl bg-primary px-4 py-4 font-bold text-on-primary shadow-lg shadow-primary/20 transition-all hover:translate-y-[-1px] hover:shadow-xl hover:shadow-primary/30 active:translate-y-[0px] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="animate-spin h-5 w-5 text-on-primary"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Authenticating...
                </span>
              ) : (
                "Sign In to Workspace"
              )}
            </button>
          </form>
        </section>

        <p className="mt-8 text-center text-xs text-on-surface-variant font-medium">
          RPG Workshop Console &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
