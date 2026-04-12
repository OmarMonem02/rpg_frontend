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
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="glass ghost-border flex flex-col justify-between rounded-[2rem] border p-8 shadow-ambient">
          <div>
            <span className="inline-flex items-center rounded-full border border-outline-variant/15 bg-surface px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-on-surface-variant">
              RPG Workshop Console
            </span>
            <h1 className="mt-5 font-display text-4xl font-semibold leading-tight text-on-surface md:text-5xl">
              Sign in to the operations floor.
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-7 text-on-surface-variant md:text-base">
              Access inventory, bike blueprints, showroom listings, payment methods, and admin controls from a single protected workspace.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-[1.5rem] border border-outline-variant/12 bg-surface p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-on-surface-variant">Inventory</p>
              <p className="mt-2 text-lg font-semibold text-on-surface">Spare parts and products</p>
            </div>
            <div className="rounded-[1.5rem] border border-outline-variant/12 bg-surface p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-on-surface-variant">Blueprints</p>
              <p className="mt-2 text-lg font-semibold text-on-surface">Model-to-parts mapping</p>
            </div>
            <div className="rounded-[1.5rem] border border-outline-variant/12 bg-surface p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-on-surface-variant">Admin</p>
              <p className="mt-2 text-lg font-semibold text-on-surface">Users, sellers, and setup</p>
            </div>
          </div>
        </section>

        <section className="glass ghost-border flex items-center rounded-[2rem] border p-6 shadow-ambient md:p-8">
          <div className="w-full">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-on-surface-variant">Authentication</p>
            <h2 className="mt-3 font-display text-3xl font-semibold text-on-surface">Welcome back</h2>
            <p className="mt-2 text-sm leading-6 text-on-surface-variant">Sign in with your RPG account to continue.</p>

            <form className="mt-8 space-y-5" onSubmit={onSubmit}>
              <div className="space-y-2">
                <label className="text-sm font-medium text-on-surface" htmlFor="email">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  className="w-full rounded-xl border border-outline-variant/40 bg-surface-container-lowest px-4 py-3 text-on-surface outline-none transition-colors focus:border-primary"
                  placeholder="admin@rpg.com"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-on-surface" htmlFor="password">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  className="w-full rounded-xl border border-outline-variant/40 bg-surface-container-lowest px-4 py-3 text-on-surface outline-none transition-colors focus:border-primary"
                  placeholder="Enter your password"
                />
              </div>

              {message ? (
                <p className="rounded-xl border border-error/20 bg-error/10 px-4 py-3 text-sm text-error">
                  {message}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full rounded-xl bg-primary px-4 py-3 font-semibold text-on-primary transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoading ? "Signing in..." : "Enter workspace"}
              </button>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}
