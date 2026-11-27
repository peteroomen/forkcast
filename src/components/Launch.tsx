"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Logo } from "./Logo";

export function Launch() {
  const router = useRouter();
  useEffect(() => {
    createClient()
      .auth.getSession()
      .then(({ data }) => router.replace(data.session ? "/plan" : "/login"));
  }, [router]);
  return (
    <main className="grid min-h-dvh place-items-center">
      <Logo />
    </main>
  );
}
