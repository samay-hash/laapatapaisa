import "server-only";
import { Resend } from "resend";
import { env } from "@/server/env";

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

export async function sendLoginCode(email: string, code: string): Promise<void> {
  if (!resend || !env.EMAIL_FROM) {
    // Development only: env validation requires Resend in production.
    console.info(`\n[login code] ${email}: ${code}\n`);
    return;
  }

  const { error } = await resend.emails.send({
    from: env.EMAIL_FROM,
    to: email,
    subject: `${code} is your LaapataPaisa login code`,
    text: [
      `Your login code is ${code}.`,
      "",
      "It expires in 10 minutes. If you did not try to log in, you can ignore this email.",
      "LaapataPaisa will never ask you for this code on a call or message.",
    ].join("\n"),
    html: `<div style="font-family:system-ui,sans-serif;color:#1c2230;line-height:1.5">
<p>Your LaapataPaisa login code is</p>
<p style="font-size:28px;font-weight:600;letter-spacing:6px;margin:8px 0 16px">${code}</p>
<p>It expires in 10 minutes. If you did not try to log in, you can ignore this email.</p>
<p style="color:#4f5667">LaapataPaisa will never ask you for this code on a call or message.</p>
</div>`,
  });

  if (error) throw new Error(`Could not send login code: ${error.message}`);
}
