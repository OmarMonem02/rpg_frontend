"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError, getMe, login } from "@/lib/auth-api";
import {
  clearAuthSession,
  getAuthToken,
  setAuthSession,
} from "@/lib/auth-session";

export function useLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;

    async function checkSession() {
      const token = getAuthToken();
      if (!token) {
        if (active) setIsCheckingSession(false);
        return;
      }

      try {
        const user = await getMe(token);
        if (active) {
          setAuthSession(token, user);
          router.replace("/");
        }
      } catch {
        if (active) {
          clearAuthSession();
          setIsCheckingSession(false);
        }
      }
    }

    void checkSession();
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

  return {
    email,
    setEmail,
    password,
    setPassword,
    isLoading,
    isCheckingSession,
    message,
    onSubmit,
  };
}
