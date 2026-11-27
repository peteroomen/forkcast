"use client";

import { useSyncExternalStore } from "react";

/**
 * Chrome fires `beforeinstallprompt` once, early. An inline script in the root
 * layout stashes it on window (window.__bip) before React hydrates; this hook
 * exposes it to any component.
 */
type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };
declare global {
  interface Window { __bip?: BIPEvent | null }
}

export const CAPTURE_SCRIPT = `
window.__bip = null;
window.addEventListener('beforeinstallprompt', function (e) {
  // No preventDefault: let Chrome show its own install UI too.
  window.__bip = e;
  window.dispatchEvent(new Event('bip-change'));
});
window.addEventListener('appinstalled', function () {
  window.__bip = null;
  window.dispatchEvent(new Event('bip-change'));
});`;

function subscribe(cb: () => void) {
  window.addEventListener("bip-change", cb);
  return () => window.removeEventListener("bip-change", cb);
}

export function useInstall() {
  const prompt = useSyncExternalStore(subscribe, () => window.__bip ?? null, () => null);
  const env = useSyncExternalStore(
    () => () => {},
    () => {
      const ua = navigator.userAgent;
      const ios = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
      const standalone =
        window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
      // In-app browsers and Chrome-on-iOS can't add to the Home Screen; Safari can.
      const iosSafari = ios && /safari/i.test(ua) && !/crios|fxios|edgios|fban|fbav|instagram/i.test(ua);
      return `${ios ? 1 : 0}${standalone ? 1 : 0}${iosSafari ? 1 : 0}`;
    },
    () => "010", // server: assume installed so nothing flashes
  );
  const [ios, standalone, iosSafari] = env.split("").map((c) => c === "1");

  async function install() {
    if (!prompt) return false;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    window.__bip = null;
    window.dispatchEvent(new Event("bip-change"));
    return outcome === "accepted";
  }

  return { canPrompt: !!prompt, install, ios, iosSafari, standalone };
}
