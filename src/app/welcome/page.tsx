import { redirect } from "next/navigation";
import { getContext } from "@/lib/data";
import { Logo } from "@/components/Logo";

export default async function Welcome() {
  const { household, user } = await getContext();
  if (household) redirect("/library");
  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <div className="card w-full max-w-sm p-6">
        <Logo />
        <p className="mt-4 text-[15px] text-muted">
          You&apos;re signed in as <strong className="text-ink">{user.email}</strong>, but this account isn&apos;t part
          of a household yet. Ask whoever runs Forkcast at home to add you.
        </p>
      </div>
    </main>
  );
}
