"use client";

import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";
import { useInstall } from "@/lib/install";

const KEY = "fc-install-dismissed-until";

/** App-wide nudge to install: a real button on Android/desktop, instructions on iPhone. */
export function InstallBanner() {
  const { canPrompt, install, ios, iosSafari, standalone } = useInstall();
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    try {
      setDismissed(Number(localStorage.getItem(KEY) ?? 0) > Date.now());
    } catch {
      setDismissed(false);
    }
  }, []);

  function dismiss() {
    setDismissed(true);
    try {
      localStorage.setItem(KEY, String(Date.now() + 14 * 86400000));
    } catch {}
  }

  if (standalone || dismissed) return null;
  if (!canPrompt && !ios) return null;

  return (
    <div className="mb-4 flex items-start gap-3 rounded-2xl border border-brand/30 bg-brand-soft p-3 text-brand">
      <img src="/icon-192.png" alt="" className="size-10 shrink-0 rounded-xl" />
      <div className="min-w-0 flex-1 text-[14px]">
        <p className="font-semibold">Put Forkcast on your home screen</p>
        {canPrompt ? (
          <p className="mt-0.5 text-brand/80">Opens like an app, and lets it remind you to get the meat out.</p>
        ) : iosSafari ? (
          <p className="mt-0.5 text-brand/80">
            Tap <Share className="inline size-4 -translate-y-0.5" /> <strong>Share</strong> (on newer iPhones it&apos;s under{" "}
            <strong>•••</strong>), then <strong>Add to Home Screen</strong>.
          </p>
        ) : (
          <p className="mt-0.5 text-brand/80">Open this page in <strong>Safari</strong>, then Share → Add to Home Screen.</p>
        )}
        {canPrompt && (
          <button onClick={install} className="btn-primary mt-2 px-3 py-1.5 text-[14px]">
            <Download className="size-4" /> Install
          </button>
        )}
      </div>
      <button onClick={dismiss} className="-m-1 p-1 text-brand/70" aria-label="Not now">
        <X className="size-4" />
      </button>
    </div>
  );
}
