import nodemailer from 'nodemailer';

/**
 * Konfigurasi Transporter Nodemailer untuk SendCoreX
 */
export function getMailTransporter() {
  const host = process.env.SMTP_HOST || 'smtp.emailsbit.com';
  const port = Number(process.env.SMTP_PORT || 588);
  const user = process.env.SMTP_USER || process.env.SENDCOREX_API_KEY;
  const pass = process.env.SMTP_PASS || process.env.SENDCOREX_API_KEY;

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    requireTLS: port === 588 || port === 587,
    auth: {
      user: user || '',
      pass: pass || '',
    },
  });
}

/**
 * Mengirim email menggunakan Nodemailer SMTP (dengan opsi fallback ke SendCoreX REST API)
 */
export async function sendEmail({
  to,
  subject,
  html,
  text,
}: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const apiKey = process.env.SENDCOREX_API_KEY;
  const fromEmail = process.env.SMTP_FROM || 'support@tabunganku.fourkeys.web.id';
  const fromName = process.env.SMTP_FROM_NAME || 'TabungKu Support';

  // 1. Coba kirim via SMTP Relay Nodemailer
  try {
    const transporter = getMailTransporter();
    const info = await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ''),
    });

    return { success: true, messageId: info.messageId };
  } catch (smtpErr: any) {
    console.warn('[SendCoreX SMTP Error, mencoba via HTTP API]:', smtpErr.message);

    // 2. Fallback via SendCoreX HTTP API
    if (apiKey) {
      try {
        const response = await fetch('https://mail.sendcorex.com/v3.0/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: apiKey,
          },
          body: JSON.stringify({
            to,
            from: fromEmail,
            senderName: fromName,
            subject,
            body: html,
          }),
        });

        const resData = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(resData?.error || resData?.message || `HTTP ${response.status}`);
        }

        return { success: true, messageId: resData?.messageId || 'api-delivered' };
      } catch (apiErr: any) {
        console.error('[SendCoreX API Error]:', apiErr.message);
        return { success: false, error: apiErr.message };
      }
    }

    return { success: false, error: smtpErr.message };
  }
}

