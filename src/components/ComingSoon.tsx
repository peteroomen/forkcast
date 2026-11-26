import type { LucideIcon } from "lucide-react";

export function ComingSoon({ icon: Icon, title, body }: { icon: LucideIcon; title: string; body: string }) {
  return (
    <div className="card mx-auto mt-6 max-w-md p-8 text-center">
      <span className="mx-auto mb-4 grid size-12 place-items-center rounded-2xl bg-brand-soft text-brand">
        <Icon className="size-6" />
      </span>
      <h1 className="font-display text-2xl font-semibold">{title}</h1>
      <p className="mt-2 text-[15px] text-muted">{body}</p>
    </div>
  );
}
