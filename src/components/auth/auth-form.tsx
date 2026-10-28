"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label } from "@/components/ui/input";
import { apiFetch } from "@/lib/http";
import { DEMO_ACCOUNT } from "@/lib/demo";

type Mode = "login" | "register";

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const isRegister = mode === "register";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(
    endpoint: Mode,
    values: { name?: string; email: string; password: string },
  ) {
    setPending(true);
    setError(null);
    try {
      await apiFetch(`/api/auth/${endpoint}`, { json: values });
      router.push("/projects");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong");
      setPending(false);
    }
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    await submit(
      mode,
      isRegister ? { name: name.trim(), email, password } : { email, password },
    );
  }

  async function useDemo() {
    setEmail(DEMO_ACCOUNT.email);
    setPassword(DEMO_ACCOUNT.password);
    await submit("login", DEMO_ACCOUNT);
  }

  return (
    <div className="animate-rise">
      <div className="mb-7">
        <h2 className="text-2xl font-semibold tracking-tight">
          {isRegister ? "Create your account" : "Welcome back"}
        </h2>
        <p className="mt-1.5 text-sm text-muted">
          {isRegister
            ? "Start a board, invite your team, and get shipping."
            : "Sign in to pick up where your team left off."}
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {isRegister ? (
          <div>
            <Label htmlFor="name">Full name</Label>
            <Input
              id="name"
              name="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ada Lovelace"
              autoComplete="name"
              maxLength={60}
              required
            />
          </div>
        ) : null}

        <div>
          <Label htmlFor="email">Work email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@company.com"
            autoComplete="email"
            maxLength={254}
            required
          />
        </div>

        <div>
          <div className="flex items-baseline justify-between">
            <Label htmlFor="password">Password</Label>
            {!isRegister ? (
              <span className="text-[11px] text-faint">
                8+ characters
              </span>
            ) : null}
          </div>
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={isRegister ? "At least 8 characters" : "Your password"}
              autoComplete={isRegister ? "new-password" : "current-password"}
              className="pr-10"
              maxLength={72}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="absolute right-1.5 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-md text-faint transition hover:bg-white/5 hover:text-ink"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff className="size-4" />
              ) : (
                <Eye className="size-4" />
              )}
            </button>
          </div>
        </div>

        <FieldError>{error}</FieldError>

        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <ArrowRight className="size-4" />
          )}
          {isRegister ? "Create account" : "Sign in"}
        </Button>
      </form>

      <div className="my-5 flex items-center gap-3 text-[11px] uppercase tracking-wider text-faint">
        <span className="h-px flex-1 bg-line-soft" />
        or
        <span className="h-px flex-1 bg-line-soft" />
      </div>

      <Button
        type="button"
        variant="secondary"
        size="lg"
        className="w-full"
        onClick={useDemo}
        disabled={pending}
      >
        <Sparkles className="size-4 text-accent-soft" />
        Explore the demo workspace
      </Button>
      <p className="mt-2 text-center text-[11px] text-faint">
        {DEMO_ACCOUNT.email} · {DEMO_ACCOUNT.password}
      </p>

      <p className="mt-7 text-center text-sm text-muted">
        {isRegister ? "Already have an account?" : "New to TaskFlow?"}{" "}
        <Link
          href={isRegister ? "/login" : "/register"}
          className="font-medium text-accent-soft underline-offset-4 hover:underline"
        >
          {isRegister ? "Sign in" : "Create an account"}
        </Link>
      </p>
    </div>
  );
}
