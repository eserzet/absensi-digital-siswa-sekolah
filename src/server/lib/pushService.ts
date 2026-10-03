// ====================================================================
// WEB PUSH NOTIFICATION SERVICE
// Server-side VAPID push sender for background notifications
// ====================================================================

import webPush from 'web-push';
import dotenv from 'dotenv';
dotenv.config();

import { getSupabaseAdmin } from './supabase.js';

// ── VAPID Configuration ──────────────────────────────────────────────

const VAPID_PUBLIC_KEY = (process.env.VAPID_PUBLIC_KEY || '').trim();
const VAPID_PRIVATE_KEY = (process.env.VAPID_PRIVATE_KEY || '').trim();
const VAPID_SUBJECT = (process.env.VAPID_SUBJECT || 'mailto:admin@smastika.sch.id').trim();

let vapidConfigured = false;

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  try {
    webPush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
    vapidConfigured = true;
    console.log('[WebPush] VAPID configured successfully.');
  } catch (err) {
    console.error('[WebPush] Failed to configure VAPID:', err);
  }
} else {
  console.warn('[WebPush] VAPID keys not found in environment. Push notifications disabled.');
}

export function isWebPushConfigured(): boolean {
  return vapidConfigured;
}

export function getVapidPublicKey(): string {
  return VAPID_PUBLIC_KEY;
}

// ── Subscription Types ───────────────────────────────────────────────

export interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;
  tag?: string;
}

// ── Subscription Management ──────────────────────────────────────────

/**
 * Save a push subscription for a user to Supabase.
 */
export async function savePushSubscription(
  userId: string,
  subscription: PushSubscriptionData,
  userAgent?: string
): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return false;

  try {
    const { error } = await supabase
      .from('push_subscriptions')
      .upsert(
        {
          user_id: userId,
          endpoint: subscription.endpoint,
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
          user_agent: userAgent || null,
          created_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,endpoint' }
      );

    if (error) {
      console.error('[WebPush] Save subscription error:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[WebPush] Save subscription exception:', err);
    return false;
  }
}

/**
 * Remove a push subscription from Supabase.
 */
export async function removePushSubscription(
  userId: string,
  endpoint: string
): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return false;

  try {
    const { error } = await supabase
      .from('push_subscriptions')
      .delete()
      .eq('user_id', userId)
      .eq('endpoint', endpoint);

    if (error) {
      console.error('[WebPush] Remove subscription error:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[WebPush] Remove subscription exception:', err);
    return false;
  }
}

// ── Send Push Notifications ──────────────────────────────────────────

/**
 * Send a push notification to a single subscription.
 * Returns true if sent successfully, false if failed (subscription may be expired).
 */
async function sendToSubscription(
  subscription: PushSubscriptionData,
  payload: PushPayload
): Promise<boolean> {
  if (!vapidConfigured) return false;

  const pushPayload = JSON.stringify({
    title: payload.title,
    body: payload.body,
    icon: payload.icon || '/pwa-192x192.png',
    badge: payload.badge || '/favicon.png',
    url: payload.url || '/',
    tag: payload.tag || `nb-${Date.now()}`,
  });

  try {
    await webPush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
        },
      },
      pushPayload,
      {
        TTL: 60 * 60, // 1 hour TTL
        urgency: 'high',
      }
    );
    return true;
  } catch (err: any) {
    // 410 Gone or 404 = subscription expired/invalid, should be cleaned up
    if (err.statusCode === 410 || err.statusCode === 404) {
      console.log(`[WebPush] Subscription expired (${err.statusCode}), cleaning up: ${subscription.endpoint.substring(0, 60)}...`);
      await cleanupExpiredSubscription(subscription.endpoint);
    } else {
      console.error(`[WebPush] Send error (${err.statusCode}):`, err.message);
    }
    return false;
  }
}

/**
 * Remove an expired subscription from the database.
 */
async function cleanupExpiredSubscription(endpoint: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  try {
    await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint);
  } catch (err) {
    console.error('[WebPush] Cleanup expired subscription error:', err);
  }
}

/**
 * Send push notification to a specific user (all their registered devices).
 */
export async function sendPushToUser(
  userId: string,
  payload: PushPayload
): Promise<{ sent: number; failed: number }> {
  if (!vapidConfigured) return { sent: 0, failed: 0 };

  const supabase = getSupabaseAdmin();
  if (!supabase) return { sent: 0, failed: 0 };

  try {
    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('user_id', userId);

    if (error || !subscriptions || subscriptions.length === 0) {
      return { sent: 0, failed: 0 };
    }

    let sent = 0;
    let failed = 0;

    for (const sub of subscriptions) {
      const success = await sendToSubscription(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        payload
      );
      if (success) sent++;
      else failed++;
    }

    return { sent, failed };
  } catch (err) {
    console.error('[WebPush] sendPushToUser exception:', err);
    return { sent: 0, failed: 0 };
  }
}

/**
 * Broadcast push notification to ALL registered subscriptions (all users/devices).
 */
export async function broadcastPush(
  payload: PushPayload
): Promise<{ sent: number; failed: number; total: number }> {
  if (!vapidConfigured) return { sent: 0, failed: 0, total: 0 };

  const supabase = getSupabaseAdmin();
  if (!supabase) return { sent: 0, failed: 0, total: 0 };

  try {
    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth');

    if (error || !subscriptions || subscriptions.length === 0) {
      return { sent: 0, failed: 0, total: 0 };
    }

    let sent = 0;
    let failed = 0;

    // Send in parallel batches of 10 to avoid overwhelming the push service
    const batchSize = 10;
    for (let i = 0; i < subscriptions.length; i += batchSize) {
      const batch = subscriptions.slice(i, i + batchSize);
      const results = await Promise.allSettled(
        batch.map((sub) =>
          sendToSubscription(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            payload
          )
        )
      );

      for (const result of results) {
        if (result.status === 'fulfilled' && result.value) sent++;
        else failed++;
      }
    }

    console.log(`[WebPush] Broadcast complete: ${sent} sent, ${failed} failed out of ${subscriptions.length} total`);
    return { sent, failed, total: subscriptions.length };
  } catch (err) {
    console.error('[WebPush] broadcastPush exception:', err);
    return { sent: 0, failed: 0, total: 0 };
  }
}
