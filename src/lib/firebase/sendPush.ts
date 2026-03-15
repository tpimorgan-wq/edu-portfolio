/**
 * Client-side helper to send push notification via API route.
 * Call this from client components after creating assignments/schedules.
 */
export async function sendPushNotification(
  userIds: string[],
  title: string,
  body: string,
  data?: Record<string, string>
) {
  if (!userIds.length) return
  try {
    await fetch('/api/notifications/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_ids: userIds, title, body, data }),
    })
  } catch {
    // best-effort, don't block UI
  }
}
