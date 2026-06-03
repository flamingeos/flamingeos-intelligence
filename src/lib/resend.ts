import { Resend } from "resend";

function getResend() {
  if (!process.env.RESEND_API_KEY) return null;
  return new Resend(process.env.RESEND_API_KEY);
}

const FROM = process.env.RESEND_FROM_EMAIL ?? "notifications@flamingeos.com";

export async function sendNotificationEmail(
  to: string,
  subject: string,
  body: string
): Promise<void> {
  const resend = getResend();
  if (!resend) return;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { background: #0a0a0a; color: #33ff00; font-family: 'Courier New', monospace; padding: 24px; }
    .container { max-width: 600px; margin: 0 auto; border: 1px solid #1f521f; padding: 24px; }
    .header { border-bottom: 1px solid #1f521f; padding-bottom: 16px; margin-bottom: 16px; }
    .title { font-size: 18px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.1em; }
    .prompt { color: #1f7a00; }
    .body { white-space: pre-wrap; line-height: 1.8; }
    .footer { border-top: 1px solid #1f521f; margin-top: 24px; padding-top: 16px; font-size: 12px; color: #1f521f; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="prompt">flamingeos@intelligence:~$</div>
      <div class="title">${subject}</div>
    </div>
    <div class="body">${body.replace(/\n/g, "<br>")}</div>
    <div class="footer">
      -- FLAMINGEOS INTELLIGENCE --<br>
      [AUTOMATED NOTIFICATION]
    </div>
  </div>
</body>
</html>`;

  await resend.emails.send({ from: FROM, to, subject: subject, html });
}

export async function sendCompetitorAlert(
  to: string,
  competitorName: string,
  videoTitle: string,
  opportunity: string
): Promise<void> {
  await sendNotificationEmail(
    to,
    `[COMPETITOR UPLOAD] ${competitorName}`,
    `COMPETITOR: ${competitorName}\n\nNEW VIDEO: "${videoTitle}"\n\nOPPORTUNITY:\n${opportunity}\n\n[VIEW IN DASHBOARD: ${process.env.NEXT_PUBLIC_APP_URL}/competitors]`
  );
}

export async function sendTrendAlert(
  to: string,
  topic: string,
  score: number,
  summary: string
): Promise<void> {
  await sendNotificationEmail(
    to,
    `[TREND ALERT] Score: ${score.toFixed(1)}/10 — ${topic}`,
    `TOPIC: ${topic}\nSCORE: ${score.toFixed(1)}/10\n\nSUMMARY:\n${summary}\n\n[VIEW IN DASHBOARD: ${process.env.NEXT_PUBLIC_APP_URL}/trends]`
  );
}
