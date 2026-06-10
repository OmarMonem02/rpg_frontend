"use client";

import { LoginBrandPanel } from "@/app/login/_components/LoginBrandPanel";
import { LoginFormCard } from "@/app/login/_components/LoginFormCard";
import { LoginShell } from "@/app/login/_components/LoginShell";
import { useLoginPage } from "@/app/login/_hooks/useLoginPage";

function LoginCheckingState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center py-24">
      <div
        className="h-10 w-10 animate-spin rounded-full border-4 border-outline-variant/30 border-t-primary"
        role="status"
        aria-label="Checking session"
      />
      <p className="mt-4 text-sm text-on-surface-variant">Checking session…</p>
    </div>
  );
}

export default function LoginPage() {
  const {
    email,
    setEmail,
    password,
    setPassword,
    isLoading,
    isCheckingSession,
    message,
    onSubmit,
  } = useLoginPage();

  return (
    <LoginShell>
      {isCheckingSession ? (
        <LoginCheckingState />
      ) : (
        <div className="w-full max-w-4xl tracking-stagger">
          <div className="tracking-verify-grid">
            <LoginBrandPanel />
            <LoginFormCard
              email={email}
              password={password}
              isLoading={isLoading}
              message={message}
              onEmailChange={setEmail}
              onPasswordChange={setPassword}
              onSubmit={onSubmit}
            />
          </div>

          <p className="label-caps mt-8 text-center text-on-surface-variant/40">
            RPG Workshop Console &copy; {new Date().getFullYear()}
          </p>
        </div>
      )}
    </LoginShell>
  );
}
