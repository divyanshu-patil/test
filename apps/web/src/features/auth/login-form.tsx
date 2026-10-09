"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { ApiError, authApi } from "@/lib/api";
import { safeNext } from "./safe-next";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setPending(true);
    setError(null);
    try {
      await authApi.login({ identifier: String(form.get("identifier")), password: String(form.get("password")) });
      router.replace(safeNext(params.get("next")));
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <h1 className="text-xl font-bold uppercase tracking-tight">Welcome back</h1>
      {params.get("expired") && !error && <Alert>Your session ended. Please log in again.</Alert>}
      {error && <Alert>{error}</Alert>}
      <Field label="Username or email" name="identifier" autoComplete="username" required autoFocus />
      <Field label="Password" name="password" type="password" autoComplete="current-password" required />
      <Button type="submit" loading={pending} className="w-full">
        Log in
      </Button>
      <p className="text-center text-sm text-muted">
        New here?{" "}
        <Link href="/register" className="font-semibold text-ink underline-offset-4 hover:underline">
          Create an account
        </Link>
      </p>
    </form>
  );
}
