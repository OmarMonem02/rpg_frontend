"use client";

import { ExclamationCircleIcon } from "@heroicons/react/24/outline";
import type { FormEvent } from "react";
import { ActionButton, InlineMessage } from "@/components/ops-ui";

type LoginFormCardProps = {
  email: string;
  password: string;
  isLoading: boolean;
  message: string;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

function SubmitSpinner() {
  return (
    <span
      className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent"
      aria-hidden
    />
  );
}

export function LoginFormCard({
  email,
  password,
  isLoading,
  message,
  onEmailChange,
  onPasswordChange,
  onSubmit,
}: LoginFormCardProps) {
  return (
    <section className="tracking-card animate-fade-in overflow-hidden">
      <div className="h-1 bg-accent" aria-hidden />
      <div className="p-6 sm:p-8">
        <div className="mb-6 lg:hidden">
          <p className="label-caps text-primary">Control center</p>
          <h2 className="mt-1 font-display text-xl font-bold text-on-surface">Sign in</h2>
          <p className="mt-1.5 text-body-sm text-on-surface-variant">
          Enter your email and password to continue.
          </p>
        </div>

        <div className="mb-6 hidden lg:block">
          <h2 className="font-display text-xl font-bold text-on-surface">Sign in</h2>
          <p className="mt-1.5 text-body-sm text-on-surface-variant">
            Enter your email and password to continue.
          </p>
        </div>

        <form className="space-y-5" onSubmit={onSubmit} noValidate>
          <div className="space-y-2">
            <label className="label-caps ml-1" htmlFor="email">
              Email address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => onEmailChange(event.target.value)}
              required
              autoComplete="email"
              className="form-input-base"
              placeholder="admin@rpg.hub"
            />
          </div>

          <div className="space-y-2">
            <label className="label-caps ml-1" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => onPasswordChange(event.target.value)}
              required
              autoComplete="current-password"
              className="form-input-base"
              placeholder="••••••••"
            />
          </div>

          {message ? (
            <InlineMessage tone="danger">
              <span
                className="flex items-center gap-3 font-medium"
                role="alert"
                aria-live="polite"
              >
                <ExclamationCircleIcon className="h-[18px] w-[18px] shrink-0" aria-hidden />
                {message}
              </span>
            </InlineMessage>
          ) : null}

          <ActionButton
            type="submit"
            tone="primary"
            size="lg"
            disabled={isLoading}
            aria-busy={isLoading}
            className="w-full rounded-2xl py-4"
          >
            {isLoading ? (
              <>
                <SubmitSpinner />
                Authenticating…
              </>
            ) : (
              "Sign in to workspace"
            )}
          </ActionButton>
        </form>
      </div>
    </section>
  );
}
