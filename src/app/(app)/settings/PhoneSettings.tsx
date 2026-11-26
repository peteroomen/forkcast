"use client";

import { useEffect, useState, useTransition } from "react";
import { Bell, BellOff, Download, Share, Smartphone } from "lucide-react";
import { useInstall } from "@/lib/install";
import {
  removePushSubscription, saveNotificationPrefs, savePushSubscription, sendTestNotification, type PrefsT,
} from "./notify-actions";


function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

type DeviceState = "checking" | "not-configured" | "unsupported" | "ios-needs-install" | "blocked" | "off" | "on";

export function PhoneSettings({ prefs: initialPrefs, meatFromFreezer: initialMeat }: { prefs: PrefsT; meatFromFreezer: boolean }) {
  const { canPrompt, install, ios: isIOS, iosSafari, standalone } = useInstall();
  const [device, setDevice] = useState<DeviceState>("checking");
  const [prefs, setPrefs] = useState(initialPrefs);
  const [meat, setMeat] = useState(initialMeat);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const sa = window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
    (async () => {
      // iOS only allows web push from a Home Screen app.
      if (ios && !sa) return setDevice("ios-needs-install");
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        return setDevice("unsupported");
      }
      if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) return setDevice("not-configured");
      if (Notification.permission === "denied") return setDevice("blocked");
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      setDevice(sub ? "on" : "off");
    })();
  }, []);

  async function turnOn() {
    setMsg(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return setDevice(permission === "denied" ? "blocked" : "off");
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
      });
      const res = await savePushSubscription(sub.toJSON(), navigator.userAgent);
      if (!res.ok) throw new Error(res.error);
      setDevice("on");
      setMsg({ ok: true, text: "Notifications are on for this device." });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Couldn't turn on notifications" });
    }
  }

  async function turnOff() {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await removePushSubscription(sub.endpoint);
      await sub.unsubscribe();
    }
    setDevice("off");
  }

  function test() {
    setMsg(null);
    start(async () => {
      const res = await sendTestNotification();
      setMsg(res.ok ? { ok: true, text: "Sent. It should pop up in a few seconds." } : { ok: false, text: res.error ?? "Failed" });
    });
  }

  function savePrefs() {
    setMsg(null);
    start(async () => {
      const res = await saveNotificationPrefs(prefs, meat);
      setMsg(res.ok ? { ok: true, text: "Reminder settings saved" } : { ok: false, text: res.error ?? "Couldn't save" });
    });
  }

  const set = <K extends keyof PrefsT>(k: K, v: PrefsT[K]) => setPrefs((p) => ({ ...p, [k]: v }));

  return (
    <section className="card space-y-4 p-4">
      <div>
        <h2 className="font-display text-lg font-semibold">On your phone</h2>
        <p className="text-[13px] text-muted">Install Forkcast and get reminders. Each person sets their own.</p>
      </div>

      {/* Install */}
      {!standalone &&
        (canPrompt ? (
          <button className="btn-primary w-full" onClick={install}>
            <Download className="size-4" /> Install Forkcast
          </button>
        ) : isIOS && !iosSafari ? (
          <p className="rounded-xl bg-surface-2 p-3 text-[13px] text-muted">
            Open Forkcast in <strong>Safari</strong> to add it to your Home Screen. Other iPhone browsers can&apos;t.
          </p>
        ) : isIOS ? (
          <div className="rounded-xl bg-brand-soft p-3 text-[14px] text-brand">
            <p className="flex items-center gap-1.5 font-medium"><Smartphone className="size-4" /> Add to your Home Screen</p>
            <p className="mt-1">
              In Safari, tap <Share className="inline size-4 -translate-y-0.5" /> <strong>Share</strong>, then{" "}
              <strong>Add to Home Screen</strong>. Open Forkcast from there to turn on notifications.
            </p>
          </div>
        ) : (
          <p className="rounded-xl bg-surface-2 p-3 text-[13px] text-muted">
            No install button? Open your browser&apos;s <strong>⋮</strong> menu and choose <strong>Install app</strong> or{" "}
            <strong>Add to Home screen</strong>. If it&apos;s already installed, open it from your home screen.
          </p>
        ))}

      {/* This device */}
      <div className="flex items-center justify-between gap-3 rounded-xl border border-line p-3">
        <span className="flex items-center gap-2 text-[15px]">
          {device === "on" ? <Bell className="size-4 text-brand" /> : <BellOff className="size-4 text-muted" />}
          {device === "on" ? "On for this device" : device === "checking" ? "Checking…" : "Off on this device"}
        </span>
        {device === "off" && <button className="btn-primary px-3 py-1.5 text-[14px]" onClick={turnOn}>Turn on</button>}
        {device === "on" && (
          <span className="flex gap-2">
            <button className="btn-ghost px-3 py-1.5 text-[14px]" onClick={test} disabled={pending}>Test</button>
            <button className="btn-ghost px-3 py-1.5 text-[14px]" onClick={turnOff}>Turn off</button>
          </span>
        )}
      </div>
      {device === "ios-needs-install" && (
        <p className="text-[13px] text-muted">On iPhone, notifications only work once Forkcast is on your Home Screen.</p>
      )}
      {device === "blocked" && (
        <p className="text-[13px] text-accent">Notifications are blocked for Forkcast. Allow them in your phone&apos;s settings, then come back.</p>
      )}
      {device === "not-configured" && (
        <p className="text-[13px] text-muted">Notifications aren&apos;t set up on the server yet (missing push keys).</p>
      )}
      {device === "unsupported" && <p className="text-[13px] text-muted">This browser can&apos;t do notifications.</p>}

      {/* What to send */}
      <div className="space-y-3 border-t border-line pt-3">
        <Row
          on={prefs.tonight}
          onToggle={(v) => set("tonight", v)}
          title="Tonight's dinner"
          sub="What's on, who's cooking, any same-day prep"
          time={prefs.morning_at}
          onTime={(t) => set("morning_at", t)}
        />
        <Row
          on={prefs.prep}
          onToggle={(v) => set("prep", v)}
          title="Prep for tomorrow"
          sub="Get the meat out, marinate, soak…"
          time={prefs.evening_at}
          onTime={(t) => set("evening_at", t)}
        />
        {prefs.prep && (
          <label className="ml-1 flex items-center gap-2 text-[13px] text-muted">
            <input type="checkbox" checked={meat} onChange={(e) => setMeat(e.target.checked)} className="size-4 accent-[var(--brand)]" />
            Our meat is usually in the freezer
          </label>
        )}
        <Row
          on={prefs.planning}
          onToggle={(v) => set("planning", v)}
          title="Time to plan"
          sub={`When nothing's planned ${prefs.planning_lead_days === 0 ? "for today" : `within ${prefs.planning_lead_days} day${prefs.planning_lead_days === 1 ? "" : "s"}`} (sent with the evening reminder)`}
        />
        {prefs.planning && (
          <label className="ml-1 flex items-center gap-2 text-[13px] text-muted">
            Warn me
            <select
              className="rounded-lg border border-line bg-surface px-2 py-1 text-ink"
              value={prefs.planning_lead_days}
              onChange={(e) => set("planning_lead_days", Number(e.target.value))}
            >
              {[0, 1, 2, 3, 4].map((d) => <option key={d} value={d}>{d === 0 ? "on the day" : `${d} day${d > 1 ? "s" : ""} ahead`}</option>)}
            </select>
          </label>
        )}
        <Row
          on={prefs.produce}
          onToggle={(v) => set("produce", v)}
          title="Fresh food check"
          sub="Lettuce, herbs and the like that might be going off. Starts with the shopping list."
        />
      </div>

      <button className="btn-ghost w-full" onClick={savePrefs} disabled={pending}>Save reminder settings</button>
      {msg && <p className={`text-[14px] ${msg.ok ? "text-brand" : "text-accent"}`}>{msg.text}</p>}
    </section>
  );
}

function Row({
  on, onToggle, title, sub, time, onTime,
}: {
  on: boolean;
  onToggle: (v: boolean) => void;
  title: string;
  sub: string;
  time?: string;
  onTime?: (t: string) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <button onClick={() => onToggle(!on)} className={`relative h-6 w-10 shrink-0 rounded-full transition ${on ? "bg-brand" : "bg-line"}`} aria-pressed={on} aria-label={title}>
        <span className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-all ${on ? "left-[18px]" : "left-0.5"}`} />
      </button>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px]">{title}</span>
        <span className="block text-[12px] text-muted">{sub}</span>
      </span>
      {time !== undefined && onTime && (
        <input
          type="time"
          className="w-[7.75rem] shrink-0 rounded-lg border border-line bg-surface px-2 py-1.5 text-[14px] disabled:opacity-40"
          value={time.slice(0, 5)}
          disabled={!on}
          onChange={(e) => onTime(e.target.value)}
        />
      )}
    </div>
  );
}
