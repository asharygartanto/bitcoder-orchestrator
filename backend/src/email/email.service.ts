import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  private getConfig() {
    return {
      provider: process.env.EMAIL_PROVIDER || 'smtp',
      smtpHost: process.env.EMAIL_SMTP_HOST || '',
      smtpPort: Number(process.env.EMAIL_SMTP_PORT) || 587,
      smtpUser: process.env.EMAIL_SMTP_USER || '',
      smtpPass: process.env.EMAIL_SMTP_PASS || '',
      smtpFrom: process.env.EMAIL_SMTP_FROM || 'noreply@bitcoder.ai',
      apiEndpoint: process.env.EMAIL_API_ENDPOINT || '',
      apiKey: process.env.EMAIL_API_KEY || '',
    };
  }

  async sendPasswordEmail(
    to: string,
    name: string,
    password: string,
    loginUrl: string,
    organizationName: string,
  ) {
    const subject = `Akun Anda telah dibuat - ${organizationName}`;
    const html = `
      <div style="font-family: 'Inter', system-ui, sans-serif; max-width: 480px; margin: 0 auto;">
        <div style="background: #157382; border-radius: 12px 12px 0 0; padding: 24px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 20px;">${organizationName}</h1>
          <p style="color: rgba(255,255,255,0.8); margin: 4px 0 0; font-size: 13px;">Bitcoder AI Orchestrator</p>
        </div>
        <div style="border: 1px solid #d4e3e7; border-top: none; border-radius: 0 0 12px 12px; padding: 24px;">
          <p style="color: #1a2b3c; font-size: 14px;">Halo <strong>${name}</strong>,</p>
          <p style="color: #3d5a6e; font-size: 13px; line-height: 1.6;">
            Akun Anda telah dibuat oleh administrator. Berikut kredensial untuk login:
          </p>
          <div style="background: #f5f9fb; border: 1px solid #d4e3e7; border-radius: 8px; padding: 16px; margin: 16px 0;">
            <p style="margin: 0 0 8px; font-size: 12px; color: #6b8a9a;">Email</p>
            <p style="margin: 0 0 12px; font-size: 14px; color: #1a2b3c; font-family: monospace; background: white; padding: 8px; border-radius: 4px; border: 1px solid #e0eaed;">${to}</p>
            <p style="margin: 0 0 8px; font-size: 12px; color: #6b8a9a;">Password</p>
            <p style="margin: 0; font-size: 14px; color: #1a2b3c; font-family: monospace; background: white; padding: 8px; border-radius: 4px; border: 1px solid #e0eaed;">${password}</p>
          </div>
          <a href="${loginUrl}" style="display: inline-block; background: #157382; color: white; padding: 10px 24px; border-radius: 8px; text-decoration: none; font-size: 13px; font-weight: 600; margin: 8px 0;">Login Sekarang</a>
          <p style="color: #6b8a9a; font-size: 11px; margin-top: 16px; line-height: 1.5;">
            Harap segera mengubah password Anda setelah login pertama.<br/>
            Jika Anda tidak merasa mendaftar, abaikan email ini.
          </p>
        </div>
        <div style="text-align: center; padding: 16px; color: #8fa8b5; font-size: 10px;">
          Powered by Bitcoder · Bale Inovasi Teknologi
        </div>
      </div>
    `;

    return this.send(to, subject, html);
  }

  async sendPasswordResetEmail(
    to: string,
    name: string,
    resetUrl: string,
    organizationName: string,
  ) {
    const subject = `Reset Password - ${organizationName}`;
    const html = `
      <div style="font-family: 'Inter', system-ui, sans-serif; max-width: 480px; margin: 0 auto;">
        <div style="background: #157382; border-radius: 12px 12px 0 0; padding: 24px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 20px;">Reset Password</h1>
          <p style="color: rgba(255,255,255,0.8); margin: 4px 0 0; font-size: 13px;">${organizationName}</p>
        </div>
        <div style="border: 1px solid #d4e3e7; border-top: none; border-radius: 0 0 12px 12px; padding: 24px;">
          <p style="color: #1a2b3c; font-size: 14px;">Halo <strong>${name}</strong>,</p>
          <p style="color: #3d5a6e; font-size: 13px; line-height: 1.6;">
            Kami menerima permintaan untuk mengatur ulang password Anda. Klik tombol di bawah:
          </p>
          <a href="${resetUrl}" style="display: inline-block; background: #157382; color: white; padding: 10px 24px; border-radius: 8px; text-decoration: none; font-size: 13px; font-weight: 600; margin: 16px 0;">Reset Password</a>
          <p style="color: #6b8a9a; font-size: 11px; margin-top: 16px; line-height: 1.5;">
            Link ini berlaku selama 1 jam.<br/>
            Jika Anda tidak meminta reset password, abaikan email ini.
          </p>
        </div>
        <div style="text-align: center; padding: 16px; color: #8fa8b5; font-size: 10px;">
          Powered by Bitcoder · Bale Inovasi Teknologi
        </div>
      </div>
    `;

    return this.send(to, subject, html);
  }

  private async send(to: string, subject: string, html: string) {
    const config = this.getConfig();

    try {
      if (config.provider === 'api' && config.apiEndpoint) {
        await axios.post(config.apiEndpoint, {
          to,
          subject,
          html,
          from: config.smtpFrom,
        }, {
          headers: {
            Authorization: `Bearer ${config.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        });
      } else if (config.provider === 'smtp' && config.smtpHost) {
        const nodemailer = require('nodemailer');
        const transporter = nodemailer.createTransport({
          host: config.smtpHost,
          port: config.smtpPort,
          secure: config.smtpPort === 465,
          auth: { user: config.smtpUser, pass: config.smtpPass },
        });
        await transporter.sendMail({
          from: config.smtpFrom,
          to,
          subject,
          html,
        });
      } else {
        this.logger.warn(`Email not sent (no provider configured). To: ${to}, Subject: ${subject}`);
        return { simulated: true, to, subject };
      }

      this.logger.log(`Email sent to ${to}: ${subject}`);
      return { success: true };
    } catch (err: any) {
      this.logger.error(`Failed to send email to ${to}: ${err.message}`);
      return { success: false, error: err.message };
    }
  }

  async sendLicenseEmail(
    to: string,
    name: string,
    licenseKey: string,
    companyName: string,
    startDate: Date,
    expiresAt: Date,
    duration: string,
    installCmd: string,
    cloudUrl: string,
  ) {
    const durationLabel: Record<string, string> = {
      ONE_WEEK: '1 Minggu',
      ONE_MONTH: '1 Bulan',
      ONE_YEAR: '1 Tahun',
      CUSTOM: 'Custom',
    };

    const subject = `License Key Bitcoder AI - ${companyName}`;
    const html = `
      <div style="font-family: 'Inter', system-ui, sans-serif; max-width: 520px; margin: 0 auto;">
        <div style="background: #157382; border-radius: 12px 12px 0 0; padding: 24px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 20px;">License Key</h1>
          <p style="color: rgba(255,255,255,0.8); margin: 4px 0 0; font-size: 13px;">Bitcoder AI Orchestrator</p>
        </div>
        <div style="border: 1px solid #d4e3e7; border-top: none; border-radius: 0 0 12px 12px; padding: 24px;">
          <p style="color: #1a2b3c; font-size: 14px;">Halo <strong>${name}</strong>,</p>
          <p style="color: #3d5a6e; font-size: 13px; line-height: 1.6;">
            Berikut license key untuk mengaktifkan Bitcoder AI Orchestrator di server Anda.
          </p>

          <div style="background: #f5f9fb; border: 1px solid #d4e3e7; border-radius: 8px; padding: 16px; margin: 16px 0;">
            <p style="margin: 0 0 4px; font-size: 10px; color: #6b8a9a; text-transform: uppercase; letter-spacing: 1px;">License Key</p>
            <p style="margin: 0 0 12px; font-size: 18px; color: #157382; font-family: monospace; font-weight: bold; letter-spacing: 2px; background: white; padding: 12px; border-radius: 6px; border: 1px solid #e0eaed; text-align: center;">${licenseKey}</p>

            <table style="width: 100%; font-size: 12px; color: #3d5a6e;">
              <tr><td style="padding: 4px 0; color: #6b8a9a;">Perusahaan</td><td style="text-align: right; font-weight: 500;">${companyName}</td></tr>
              <tr><td style="padding: 4px 0; color: #6b8a9a;">Masa Berlaku</td><td style="text-align: right; font-weight: 500;">${durationLabel[duration] || duration}</td></tr>
              <tr><td style="padding: 4px 0; color: #6b8a9a;">Aktif Mulai</td><td style="text-align: right; font-weight: 500;">${startDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</td></tr>
              <tr><td style="padding: 4px 0; color: #6b8a9a;">Berlaku Hingga</td><td style="text-align: right; font-weight: 500;">${expiresAt.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</td></tr>
            </table>
          </div>

          <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 16px; margin: 16px 0;">
            <p style="margin: 0 0 8px; font-size: 12px; font-weight: 600; color: #1e40af;">Cara Aktivasi</p>
            <p style="margin: 0 0 4px; font-size: 11px; color: #3b82f6;">1. Jalankan install command di server Anda</p>
            <p style="margin: 0 0 4px; font-size: 11px; color: #3b82f6;">2. Saat diminta, masukkan license key di atas</p>
            <p style="margin: 0; font-size: 11px; color: #3b82f6;">3. Agent akan otomatis terhubung ke cloud</p>
          </div>

          <a href="${cloudUrl}" style="display: inline-block; background: #157382; color: white; padding: 10px 24px; border-radius: 8px; text-decoration: none; font-size: 13px; font-weight: 600; margin: 8px 0;">Buka Dashboard</a>

          <p style="color: #6b8a9a; font-size: 11px; margin-top: 16px; line-height: 1.5;">
            Jika Anda merasa tidak menerima email ini, abaikan.<br/>
            Untuk bantuan, hubungi support@bitcoder.ai
          </p>
        </div>
        <div style="text-align: center; padding: 16px; color: #8fa8b5; font-size: 10px;">
          Powered by Bitcoder · Bale Inovasi Teknologi
        </div>
      </div>
    `;

    return this.send(to, subject, html);
  }
}
