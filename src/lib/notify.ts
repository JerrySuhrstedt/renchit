/**
 * Sending an alert to the people who asked to hear about it.
 *
 * Email goes through Resend, which is already set up for sign-in links. SMS
 * goes through Twilio if it is configured, and is skipped cleanly if not, so
 * the feature works on email alone rather than failing entirely.
 */

export type Recipient = {
  name: string | null;
  email: string | null;
  phone: string | null;
  emailEnabled: boolean;
  smsEnabled: boolean;
};

export type AlertMessage = {
  subject: string;
  /** Kept short: this may arrive as a text message on a phone. */
  sms: string;
  html: string;
  text: string;
};

export function smsConfigured(): boolean {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_FROM_NUMBER,
  );
}

function emailConfigured(): boolean {
  const key = process.env.AUTH_RESEND_KEY;
  return Boolean(key) && key !== "PASTE_HERE";
}

async function sendEmail(to: string, msg: AlertMessage): Promise<boolean> {
  if (!emailConfigured()) return false;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.AUTH_RESEND_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM ?? "renchit <hello@renchit.com>",
        to,
        subject: msg.subject,
        html: msg.html,
        text: msg.text,
      }),
    });
    if (!res.ok) console.error("[alert] email refused", res.status, await res.text());
    return res.ok;
  } catch (err) {
    console.error("[alert] email failed", err);
    return false;
  }
}

async function sendSms(to: string, body: string): Promise<boolean> {
  if (!smsConfigured()) return false;
  const sid = process.env.TWILIO_ACCOUNT_SID!;
  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${process.env.TWILIO_AUTH_TOKEN}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: to,
        From: process.env.TWILIO_FROM_NUMBER!,
        Body: body,
      }),
    });
    if (!res.ok) console.error("[alert] sms refused", res.status, await res.text());
    return res.ok;
  } catch (err) {
    console.error("[alert] sms failed", err);
    return false;
  }
}

/**
 * Fans an alert out to everyone. Returns how many messages actually went, so
 * an alert nobody received is visible in the log rather than assumed sent.
 */
export async function notifyAll(
  recipients: Recipient[],
  msg: AlertMessage,
): Promise<number> {
  const sends: Array<Promise<boolean>> = [];

  for (const r of recipients) {
    if (r.emailEnabled && r.email) sends.push(sendEmail(r.email, msg));
    if (r.smsEnabled && r.phone) sends.push(sendSms(r.phone, msg.sms));
  }

  const results = await Promise.all(sends);
  return results.filter(Boolean).length;
}

const INK = "#241c15";
const MUTED = "#6b5d4f";
const PAPER = "#fdf8f3";

/** Down and recovery emails, deliberately plain so they survive spam filters. */
export function buildAlert(opts: {
  kind: "down" | "recovered";
  url: string;
  statusCode: number | null;
  error: string | null;
  downtimeMinutes: number | null;
}): AlertMessage {
  const host = safeHost(opts.url);
  const down = opts.kind === "down";
  const accent = down ? "#dc2626" : "#15803d";

  const reason = opts.statusCode
    ? `It returned a ${opts.statusCode} error.`
    : opts.error
      ? `We could not reach it at all (${opts.error}).`
      : "We could not reach it at all.";

  const subject = down ? `${host} is down` : `${host} is back up`;

  const sms = down
    ? `renchit: ${host} appears to be DOWN. ${reason}`
    : `renchit: ${host} is back up${opts.downtimeMinutes ? ` after about ${opts.downtimeMinutes} min` : ""}.`;

  const headline = down ? `${host} appears to be down` : `${host} is back up`;
  const body = down
    ? `${reason} We check every few minutes and will email again the moment it recovers.`
    : `${opts.downtimeMinutes ? `It was unreachable for about ${opts.downtimeMinutes} minutes. ` : ""}Nothing else to do.`;

  return {
    subject,
    sms,
    text: `${headline}\n\n${body}\n\n${opts.url}`,
    html: `<!doctype html><html><body style="margin:0;padding:0;background:${PAPER};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${PAPER};padding:40px 16px;"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border:1px solid #ece2d6;border-radius:20px;padding:32px;">
<tr><td style="font-size:20px;font-weight:800;color:${INK};padding-bottom:18px;">renchit</td></tr>
<tr><td style="font-size:17px;font-weight:700;color:${accent};padding-bottom:8px;">${headline}</td></tr>
<tr><td style="font-size:15px;line-height:1.55;color:${MUTED};padding-bottom:20px;">${body}</td></tr>
<tr><td style="font-size:13px;color:${MUTED};word-break:break-all;padding-bottom:20px;">${opts.url}</td></tr>
<tr><td style="border-top:1px solid #ece2d6;padding-top:16px;font-size:12px;line-height:1.5;color:${MUTED};">
You are getting this because you were added as an alert contact in renchit. Ask whoever set it up to remove you if you would rather not.
</td></tr>
</table></td></tr></table></body></html>`,
  };
}

function safeHost(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}
