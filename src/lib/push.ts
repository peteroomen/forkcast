import "server-only";
import webpush from "web-push";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { NotificationPayload } from "./notifications";

export interface StoredSubscription { id: string; endpoint: string; p256dh: string; auth: string }

let configured = false;
function configure() {
  if (configured) return;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) throw new Error("VAPID keys are not set");
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:forkcast@example.invalid", pub, priv);
  configured = true;
}

/**
 * Send to each device. Dead subscriptions (404/410: uninstalled, permission
 * revoked) are removed. Returns how many devices accepted it.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function sendPush(db: SupabaseClient<any, "forkcast", any>, subs: StoredSubscription[], payload: NotificationPayload): Promise<number> {
  configure();
  let delivered = 0;
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify(payload),
          { TTL: 6 * 60 * 60, urgency: "normal" },
        );
        delivered++;
        await db.from("push_subscriptions").update({ last_success_at: new Date().toISOString(), failure_count: 0 }).eq("id", s.id);
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) await db.from("push_subscriptions").delete().eq("id", s.id);
        else console.error("push failed", status, (e as Error).message);
      }
    }),
  );
  return delivered;
}
