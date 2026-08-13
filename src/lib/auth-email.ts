/**
 * The sign-in email.
 *
 * Deliberately plain: one sentence, one button, one fallback link. Sign-in
 * emails get filtered aggressively, and image-heavy marketing layouts are a
 * large part of why. Inline styles throughout, because email clients strip
 * stylesheets.
 */

const BRAND = "#c43d1c";
const INK = "#241c15";
const MUTED = "#6b5d4f";
const PAPER = "#fdf8f3";

export function signInEmailHtml({ url, host }: { url: string; host: string }): string {
  return `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:0;background:${PAPER};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${PAPER};padding:40px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border:1px solid #ece2d6;border-radius:20px;padding:36px 32px;">
            <tr>
              <td style="font-size:22px;font-weight:800;color:${INK};letter-spacing:-0.02em;padding-bottom:20px;">
                renchit
              </td>
            </tr>
            <tr>
              <td style="font-size:17px;font-weight:700;color:${INK};padding-bottom:8px;">
                Here is your sign-in link
              </td>
            </tr>
            <tr>
              <td style="font-size:15px;line-height:1.55;color:${MUTED};padding-bottom:24px;">
                Click the button below and you are in. No password needed. This
                link works once and expires in 24 hours.
              </td>
            </tr>
            <tr>
              <td style="padding-bottom:24px;">
                <a href="${url}"
                   style="display:inline-block;background:${BRAND};color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:13px 28px;border-radius:14px;">
                  Sign in to renchit
                </a>
              </td>
            </tr>
            <tr>
              <td style="font-size:13px;line-height:1.5;color:${MUTED};padding-bottom:6px;">
                If the button does not work, paste this into your browser:
              </td>
            </tr>
            <tr>
              <td style="font-size:12px;line-height:1.5;color:${MUTED};word-break:break-all;padding-bottom:24px;">
                ${url}
              </td>
            </tr>
            <tr>
              <td style="border-top:1px solid #ece2d6;padding-top:18px;font-size:12px;line-height:1.5;color:${MUTED};">
                If you did not ask to sign in to ${host}, you can ignore this
                email. Nobody can access your account without this link.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function signInEmailText({ url, host }: { url: string; host: string }): string {
  return [
    "Here is your sign-in link for renchit.",
    "",
    url,
    "",
    "No password needed. This link works once and expires in 24 hours.",
    "",
    `If you did not ask to sign in to ${host}, you can ignore this email.`,
  ].join("\n");
}
