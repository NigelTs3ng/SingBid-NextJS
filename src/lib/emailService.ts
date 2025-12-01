"use server";

const resendApiKey = process.env.RESEND_API_KEY || '';
const defaultFromEmail = process.env.EMAIL_FROM || 'BidWin <no-reply@bidwin.com>';

interface SendEmailParams {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
}

export async function sendEmail({
  to,
  subject,
  html,
  text,
  from = defaultFromEmail,
}: SendEmailParams): Promise<{ success: boolean; skipped?: boolean }> {
  if (!resendApiKey) {
    console.warn('[EmailService] RESEND_API_KEY is not set. Email skipped.', { to, subject });
    return { success: false, skipped: true };
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to,
        subject,
        html,
        text,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('[EmailService] Resend API error', { status: response.status, body: errorBody });
      return { success: false };
    }

    return { success: true };
  } catch (error) {
    console.error('[EmailService] Failed to send email', { to, subject, error });
    return { success: false };
  }
}

