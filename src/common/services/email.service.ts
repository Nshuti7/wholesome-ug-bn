import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    const port = parseInt(this.configService.get<string>('SMTP_PORT') || '587');
    // Port 465 requires secure: true, port 587 uses TLS
    const isSecure = port === 465;

    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('SMTP_HOST'),
      port: port,
      secure: isSecure, // true for 465, false for other ports
      auth: {
        user: this.configService.get<string>('SMTP_USER'),
        pass: this.configService.get<string>('SMTP_PASS'),
      },
    });
  }

  async sendEmail(to: string, subject: string, text: string, html?: string): Promise<void> {
    await this.transporter.sendMail({
      from: `"Wholesome Uganda" <${this.configService.get<string>('EMAIL_FROM')}>`,
      to,
      subject,
      text,
      ...(html && { html }),
    });
  }

  generateOtpTemplate(name: string, otp: string): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Password Reset</title>
  <style>
    body {
      font-family: "Segoe UI", Arial, sans-serif;
      line-height: 1.6;
      color: #333333;
      margin: 0;
      padding: 0;
      background-color: #f9f9f9;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
    }
    .header {
      background-color: #000000;
      padding: 20px;
      text-align: center;
    }
    .content {
      padding: 30px;
    }
    h2 {
      color: #2c3e50;
      margin-top: 0;
      margin-bottom: 20px;
    }
    .otp-container {
      background-color: #f5f8fa;
      border-radius: 6px;
      padding: 20px;
      text-align: center;
      margin: 25px 0;
      border-left: 4px solid #000000;
    }
    .otp {
      font-size: 28px;
      font-weight: bold;
      letter-spacing: 2px;
      color: #2c3e50;
      font-family: "Courier New", monospace;
    }
    .note {
      font-size: 14px;
      color: #777777;
      margin-top: 6px;
    }
    .warning {
      background-color: #fff8e1;
      border-left: 4px solid #ffc107;
      padding: 12px 15px;
      margin: 25px 0;
      font-size: 14px;
      color: #5d4037;
    }
    .footer {
      background-color: #f5f8fa;
      padding: 20px;
      text-align: center;
      font-size: 13px;
      color: #777777;
      border-top: 1px solid #eaeaea;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="color: white; margin: 0;">Wholesome Uganda</h1>
    </div>
    <div class="content">
      <h2>Hello ${name},</h2>
      <p>You recently requested to reset your password. Use the One-Time Password (OTP) below:</p>
      <div class="otp-container">
        <div class="otp">${otp}</div>
        <p class="note">This code will expire in <strong>5 minutes</strong></p>
      </div>
      <div class="warning">
        If you didn't request a password reset, please ignore this email.
      </div>
      <p>Thank you,<br />Wholesome Uganda Team</p>
    </div>
    <div class="footer">
      <p>© 2025 Wholesome Uganda. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `;
  }
}
