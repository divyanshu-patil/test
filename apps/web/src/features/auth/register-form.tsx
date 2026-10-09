"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { ApiError, authApi } from "@/lib/api";

type Values = { email: string; username: string; password: string; display_name: string };
type Errors = Partial<Record<keyof Values, string>>;

/** Mirrors the API rules for instant feedback; the API remains the source of truth. */
export function validateRegistration(v: Values): Errors {
  const e: Errors = {};
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email.trim())) e.email = "Enter a valid email address.";
  const u = v.username.trim().toLowerCase();
  if (!/^[a-z0-9._]{3,30}$/.test(u)) e.username = "3–30 characters: letters, numbers, periods and underscores.";
  else if (u.startsWith(".") || u.endsWith(".") || u.includes(".."))
    e.username = "Periods can't be at the start, end, or repeated.";
  if (v.password.length < 8) e.password = "Use at least 8 characters.";
  else if (!/[A-Za-z]/.test(v.password) || !/\d/.test(v.password))
    e.password = "Include at least one letter and one number.";
  if (v.display_name.length > 60) e.display_name = "Keep it under 60 characters.";
  return e;
}

export function RegisterForm() {
  const router = useRouter();
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const values: Values = {
      email: String(f.get("email") ?? ""),
      username: String(f.get("username") ?? ""),
      password: String(f.get("password") ?? ""),
      display_name: String(f.get("display_name") ?? ""),
    };
    const found = validateRegistration(values);
    setErrors(found);
    setFormError(null);
    if (Object.keys(found).length) return;
    setPending(true);
    try {
      await authApi.register({ ...values, display_name: values.display_name.trim() || undefined });
      router.replace("/feed");
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(err.fields as Errors);
        setFormError(Object.keys(err.fields).length ? null : err.message);
      } else setFormError("Something went wrong.");
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div>
        <h1 className="text-xl font-bold uppercase tracking-tight">Create your account</h1>
        <p className="mt-1 text-sm text-muted">It takes less than a minute.</p>
      </div>
      {formError && <Alert>{formError}</Alert>}
      <Field label="Email" name="email" type="email" autoComplete="email" required error={errors.email} autoFocus />
      <Field
        label="Username"
        name="username"
        autoComplete="username"
        autoCapitalize="none"
        spellCheck={false}
        required
        error={errors.username}
        hint="Letters, numbers, periods and underscores."
      />
      <Field label="Display name (optional)" name="display_name" autoComplete="name" error={errors.display_name} />
      <Field
        label="Password"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        error={errors.password}
        hint="At least 8 characters, with a letter and a number."
      />
      <Button type="submit" loading={pending} className="w-full">
        Sign up
      </Button>
      <p className="text-center text-sm text-muted">
        Have an account?{" "}
        <Link href="/login" className="font-semibold text-ink underline-offset-4 hover:underline">
          Log in
        </Link>
      </p>
    </form>
  );
}
