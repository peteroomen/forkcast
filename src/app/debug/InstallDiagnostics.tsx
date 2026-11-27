"use client";

import { useEffect, useState } from "react";

type Row = { label: string; value: string; ok?: boolean | null };

/** On-device install diagnostics: everything a page can learn about installability. */
export function InstallDiagnostics() {
  const [rows, setRows] = useState<Row[]>([]);
  const [bip, setBip] = useState<boolean>(false);

  useEffect(() => {
    const update = () => setBip(!!window.__bip);
    update();
    window.addEventListener("bip-change", update);

    (async () => {
      const out: Row[] = [];
      const ua = navigator.userAgent;
      out.push({ label: "Chrome version", value: ua.match(/Chrome\/([\d.]+)/)?.[1] ?? "not Chrome" });
      out.push({ label: "Secure (https)", value: String(window.isSecureContext), ok: window.isSecureContext });
      const standalone = window.matchMedia("(display-mode: standalone)").matches;
      out.push({ label: "Running as installed app", value: String(standalone) });

      // Manifest
      try {
        const link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
        const res = await fetch(link?.href ?? "/manifest.webmanifest", { cache: "no-store" });
        const m = await res.json();
        out.push({ label: "Manifest", value: `${res.status} · start ${m.start_url} · ${m.display} · ${m.icons?.length} icons`, ok: res.ok });
        for (const icon of m.icons ?? []) {
          const r = await fetch(icon.src, { cache: "no-store" });
          out.push({ label: `Icon ${icon.sizes} (${icon.purpose})`, value: `${r.status} ${r.headers.get("content-type")}`, ok: r.ok });
        }
      } catch (e) {
        out.push({ label: "Manifest", value: String(e), ok: false });
      }

      // Service worker
      if ("serviceWorker" in navigator) {
        const reg = await navigator.serviceWorker.getRegistration();
        out.push({ label: "Service worker registered", value: reg ? `${reg.active?.state ?? "not active"} · scope ${reg.scope}` : "no", ok: !!reg?.active });
        out.push({ label: "Page controlled by worker", value: String(!!navigator.serviceWorker.controller), ok: !!navigator.serviceWorker.controller });
      } else {
        out.push({ label: "Service worker", value: "unsupported", ok: false });
      }

      // Does Chrome think it's already installed?
      const nav = navigator as Navigator & { getInstalledRelatedApps?: () => Promise<{ platform: string; url?: string }[]> };
      if (nav.getInstalledRelatedApps) {
        try {
          const apps = await nav.getInstalledRelatedApps();
          out.push({
            label: "Chrome thinks it's installed",
            value: apps.length ? `YES: ${apps.map((a) => `${a.platform} ${a.url ?? ""}`).join(", ")}` : "no",
            ok: apps.length === 0,
          });
        } catch (e) {
          out.push({ label: "Chrome thinks it's installed", value: `check failed: ${e}` });
        }
      } else {
        out.push({ label: "Chrome thinks it's installed", value: "can't check in this browser" });
      }

      out.push({ label: "Notifications permission", value: "Notification" in window ? Notification.permission : "unsupported" });
      setRows(out);
    })();
    return () => window.removeEventListener("bip-change", update);
  }, []);

  const text = [...rows.map((r) => `${r.label}: ${r.value}`), `Install prompt fired: ${bip}`].join("\n");

  return (
    <main className="mx-auto max-w-lg p-4">
      <h1 className="font-display text-2xl font-semibold">Install check</h1>
      <p className="mt-1 text-[14px] text-muted">Screenshot this, or tap Copy and paste it to Claude.</p>
      <ul className="mt-4 divide-y divide-line rounded-2xl border border-line bg-surface">
        {[...rows, { label: "Install prompt fired (this visit)", value: String(bip), ok: null }].map((r) => (
          <li key={r.label} className="flex justify-between gap-3 p-3 text-[14px]">
            <span className="text-muted">{r.label}</span>
            <span className={`text-right font-medium ${r.ok === false ? "text-accent" : r.ok ? "text-brand" : ""}`}>{r.value}</span>
          </li>
        ))}
      </ul>
      <button className="btn-ghost mt-3 w-full" onClick={() => navigator.clipboard?.writeText(text)}>Copy</button>
    </main>
  );
}
