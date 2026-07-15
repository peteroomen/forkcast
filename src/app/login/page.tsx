"use client";

import { useState } from "react";
import { Utensils } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const configured =
    typeof process.env.NEXT_PUBLIC_SUPABASE_URL === "string" &&
    process.env.NEXT_PUBLIC_SUPABASE_URL.length > 0;

  async function signInWithGoogle() {
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) setError(error.message);
  }

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setLoading(false);
    if (error) setError(error.message);
    else setSent(true);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-base-200 p-4">
      <div className="card w-full max-w-sm bg-base-100 shadow-xl">
        <div className="card-body">
          <div className="mb-2 flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-lg bg-primary text-primary-content">
              <Utensils className="size-5" />
            </span>
            <h1 className="text-2xl font-bold tracking-tight">Forkcast</h1>
          </div>
          <p className="mb-4 text-sm text-base-content/60">
            Sign in to plan the fortnight.
          </p>

          {!configured && (
            <div className="alert alert-warning mb-3 text-sm">
              Supabase isn&apos;t configured yet. Add your env vars (see the
              deploy runbook) to enable sign-in.
            </div>
          )}

          <button
            onClick={signInWithGoogle}
            disabled={!configured}
            className="btn btn-outline w-full"
          >
            Continue with Google
          </button>

          <div className="divider text-xs">or</div>

          {sent ? (
            <div className="alert alert-success text-sm">
              Check your email for a magic link.
            </div>
          ) : (
            <form onSubmit={sendMagicLink} className="flex flex-col gap-2">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="input input-bordered w-full"
              />
              <button
                type="submit"
                disabled={!configured || loading}
                className="btn btn-primary w-full"
              >
                {loading ? "Sending…" : "Email me a magic link"}
              </button>
            </form>
          )}

          {error && (
            <p className="mt-3 text-sm text-error" role="alert">
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
