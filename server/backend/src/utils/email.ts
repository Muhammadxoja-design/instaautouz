import nodemailer from 'nodemailer';
import { logger } from './logger.js';

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (host && user && pass) {
    transporter = nodemailer.createTransport({
      host,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: (process.env.SMTP_PORT || '587') === '465',
      auth: { user, pass },
    });
  }

  return transporter;
}

export async function sendOtpEmail(email: string, code: string): Promise<void> {
  const t = getTransporter();

  if (t) {
    try {
      await t.sendMail({
        from: process.env.EMAIL_FROM || `"InstaAutoUZ" <${process.env.SMTP_USER}>`,
        to: email,
        subject: 'InstaAutoUZ — Tasdiqlash kodi',
        text: `Sizning tasdiqlash kodingiz: ${code}\n\nAgar bu so'rovni siz amalga oshirmagan bo'lsangiz, xabarni e'tiborsiz qoldiring.`,
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
            <h2 style="color:#6C63FF">InstaAutoUZ</h2>
            <p style="color:#555;font-size:14px">Tasdiqlash kodingiz:</p>
            <div style="background:#f5f5f5;border-radius:12px;padding:16px;text-align:center;font-size:32px;letter-spacing:8px;font-weight:bold;color:#333;margin:16px 0">${code}</div>
            <p style="color:#999;font-size:12px">Kod 10 daqiqa davomida amal qiladi.</p>
            <hr style="border:none;border-top:1px solid #eee;margin:16px 0" />
            <p style="color:#999;font-size:11px">Agar bu so'rovni siz amalga oshirmagan bo'lsangiz, xabarni e'tiborsiz qoldiring.</p>
          </div>
        `,
      });
      logger.success(`Email sent: ${email}`);
      return;
    } catch (err) {
      logger.error(`Email send failed: ${email} — ${err instanceof Error ? err.message : err}`);
    }
  }

  logger.info(`OTP for ${email} → ${code}`);
}
