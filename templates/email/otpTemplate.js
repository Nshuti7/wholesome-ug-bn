module.exports = (name, otp) => {
  return `
   <!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Password Reset — Ubuntu Footprints</title>
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
        background-color: #15120F;
        padding: 26px 20px;
        text-align: center;
      }

      .wordmark {
        font-size: 22px;
        font-weight: 800;
        letter-spacing: 2px;
        color: #ffffff;
        margin: 0;
      }
      .wordmark span { color: #F69E06; }

      .content {
        padding: 30px;
      }

      h2 {
        color: #2c3e50;
        margin-top: 0;
        margin-bottom: 20px;
        font-weight: 600;
      }
      .otp-container {
        background-color: #fff7e9;
        border-radius: 6px;
        padding: 20px;
        text-align: center;
        margin: 25px 0;
        border-left: 4px solid #F69E06;
      }
      .otp {
        font-size: 28px;
        font-weight: bold;
        letter-spacing: 2px;
        color: #15120F;
        font-family: "Courier New", monospace;
      }
      .note {
        font-size: 14px;
        color: #777777;
        margin-top: 6px;
      }
      .warning {
        background-color: #fff8e1;
        border-left: 4px solid #F69E06;
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
      .social-links {
        margin-top: 15px;
      }
      .social-links a {
        display: inline-block;
        margin: 0 8px;
        color: #B45309;
        text-decoration: none;
      }
      @media only screen and (max-width: 480px) {
        .content {
          padding: 20px;
        }
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <p class="wordmark">UBUNTU <span>FOOTPRINTS</span></p>
      </div>

      <div class="content">
        <h2>Hello ${name},</h2>

        <p>
          You recently requested to reset your password for your
          <strong>Ubuntu Footprints Admin</strong> account. Use the One-Time
          Password (OTP) below to complete the process.
        </p>

        <div class="otp-container">
          <div class="otp">${otp}</div>
          <p class="note">
            This code will expire in <strong>5 minutes</strong>
          </p>
        </div>

        <p>
          If you're having issues, you can contact our support team directly at
          <a href="mailto:support@ubuntufootprints.com">support@ubuntufootprints.com</a>
        </p>

        <div class="warning">
          If you didn't request a password reset, please ignore this email or
          contact our support team immediately as your account may be at risk.
        </div>

        <p>Thank you,<br />The Ubuntu Footprints Team</p>
      </div>

      <div class="footer">
        <p>© 2026 Ubuntu Footprints. All rights reserved.</p>
        <p>Kampala, Uganda · This is an automated message, please do not reply.</p>

        <div class="social-links">
          <a href="https://facebook.com/ubuntufootprints">Facebook</a> •
          <a href="https://x.com/ubuntufootprints">X</a> •
          <a href="https://instagram.com/ubuntufootprints">Instagram</a>
        </div>
      </div>
    </div>
  </body>
</html>
  `;
};
