import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_ADDRESS = process.env.EMAIL_FROM ?? "notifications@8gentc.com";

interface DigestNotification {
  type: string;
  title: string;
  body: string;
  createdAt: string;
}

export async function sendDigestEmail(
  to: string,
  userName: string,
  notifications: DigestNotification[],
  period: "daily" | "weekly"
) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[email] RESEND_API_KEY not set — skipping email send");
    return null;
  }

  const notificationRows = notifications
    .map(
      (n) =>
        `<tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #f0f0f0;">
            <span style="display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 600; background: ${getTypeBadgeColor(n.type)}; color: #fff;">${formatType(n.type)}</span>
            <p style="margin: 6px 0 2px; font-weight: 500;">${escapeHtml(n.title)}</p>
            <p style="margin: 0; color: #6b7280; font-size: 13px;">${escapeHtml(n.body).slice(0, 200)}</p>
          </td>
        </tr>`
    )
    .join("");

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width" /></head>
<body style="margin: 0; padding: 0; background: #f9fafb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 560px; margin: 0 auto; padding: 40px 20px;">
    <div style="background: #fff; border-radius: 8px; border: 1px solid #e5e7eb; overflow: hidden;">
      <div style="padding: 24px; border-bottom: 1px solid #e5e7eb;">
        <h1 style="margin: 0; font-size: 18px; font-weight: 700;">Your ${period} digest</h1>
        <p style="margin: 6px 0 0; color: #6b7280; font-size: 14px;">
          Hi ${escapeHtml(userName)}, here's what happened ${period === "daily" ? "today" : "this week"}.
        </p>
      </div>
      <table style="width: 100%; border-collapse: collapse;">
        ${notificationRows || '<tr><td style="padding: 24px; text-align: center; color: #9ca3af;">No new notifications</td></tr>'}
      </table>
      <div style="padding: 16px 24px; border-top: 1px solid #e5e7eb; text-align: center;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL ?? "https://8gentc.com"}/notifications" style="display: inline-block; padding: 8px 20px; background: #18181b; color: #fff; border-radius: 6px; text-decoration: none; font-size: 13px; font-weight: 500;">
          View all notifications
        </a>
      </div>
    </div>
    <p style="text-align: center; margin: 16px 0 0; color: #9ca3af; font-size: 12px;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL ?? "https://8gentc.com"}/settings/notifications" style="color: #9ca3af;">Manage preferences</a>
    </p>
  </div>
</body>
</html>`;

  const { data, error } = await resend.emails.send({
    from: FROM_ADDRESS,
    to,
    subject: `Your ${period} 8gentc digest — ${notifications.length} update${notifications.length !== 1 ? "s" : ""}`,
    html,
  });

  if (error) {
    console.error("[email] Failed to send digest:", error);
    return null;
  }

  return data;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatType(type: string): string {
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function getTypeBadgeColor(type: string): string {
  switch (type) {
    case "goal_nudge":
      return "#8b5cf6";
    case "agent_finding":
      return "#22c55e";
    case "stale_content":
      return "#f59e0b";
    case "system":
      return "#6b7280";
    default:
      return "#6b7280";
  }
}
