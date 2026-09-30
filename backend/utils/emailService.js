import nodemailer from "nodemailer";

/**
 * Create and return Nodemailer transporter instance
 */
const createTransporter = () => {
  const user = (process.env.EMAIL_USER || "").trim();
  // Strip any spaces that might have been copied with the Google App Password
  const pass = (process.env.EMAIL_PASSWORD || "").replace(/\s+/g, "");
  const service = (process.env.EMAIL_SERVICE || "").trim().toLowerCase();

  if (
    !user ||
    !pass ||
    user.includes("your-email") ||
    pass.includes("your-app-password") ||
    user.includes("your_email") ||
    pass.includes("your_app_password")
  ) {
    return null;
  }

  // If using Gmail
  if (service === "gmail" || user.toLowerCase().endsWith("@gmail.com")) {
    return nodemailer.createTransport({
      service: "gmail",
      auth: {
        user,
        pass,
      },
    });
  }

  // Custom SMTP fallback
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = parseInt(process.env.SMTP_PORT || "587", 10);

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });
};

/**
 * Send Professional HTML Email OTP to User
 * 
 * @param {string} toEmail - Recipient email address
 * @param {string} otpCode - 6-digit OTP code
 * @returns {Promise<{ sent: boolean, devMode: boolean, messageId?: string, error?: string }>}
 */
export const sendOTPEmail = async (toEmail, otpCode) => {
  const transporter = createTransporter();

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Your EV Charging Portal Login OTP</title>
      <style>
        body { font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b1329; color: #e2e8f0; margin: 0; padding: 0; }
        .container { max-width: 520px; margin: 30px auto; background: #0f172a; border-radius: 20px; border: 1px solid #1e293b; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5); }
        .header { background: linear-gradient(135deg, #10b981 0%, #06b6d4 100%); padding: 32px 24px; text-align: center; }
        .header h1 { margin: 0; color: #090d16; font-size: 26px; font-weight: 800; letter-spacing: -0.5px; font-family: monospace; }
        .header p { margin: 6px 0 0 0; color: #042f2e; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; }
        .content { padding: 36px 32px; text-align: center; }
        .subtitle { font-size: 15px; color: #94a3b8; margin-bottom: 24px; font-weight: 500; }
        .otp-box { background: #1e293b; border: 2px dashed #10b981; border-radius: 16px; padding: 20px; display: inline-block; margin: 10px 0 24px 0; }
        .otp-code { font-size: 42px; font-weight: 800; color: #10b981; font-family: 'Courier New', Courier, monospace; letter-spacing: 10px; margin: 0; }
        .badge { display: inline-block; background: rgba(16, 185, 129, 0.15); color: #34d399; font-size: 12px; font-weight: 700; padding: 6px 14px; rounded: 9999px; border-radius: 20px; margin-bottom: 20px; }
        .footer { padding: 24px 32px; background: #0b1329; border-top: 1px solid #1e293b; text-align: center; font-size: 12px; color: #64748b; }
        .footer p { margin: 4px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>⚡ EV CHARGING PORTAL</h1>
          <p>Smart EV Charging Station Management System</p>
        </div>
        <div class="content">
          <p class="subtitle">Use the One-Time Password (OTP) below to authenticate your session.</p>
          <div class="otp-box">
            <h2 class="otp-code">${otpCode}</h2>
          </div>
          <div>
            <span class="badge">⏱️ Valid for 5 Minutes</span>
          </div>
          <p style="font-size: 13px; color: #94a3b8; line-height: 1.6; margin-top: 20px;">
            Do not share this OTP code with anyone. EV Charging support will never ask for your OTP.
          </p>
        </div>
        <div class="footer">
          <p>If you did not request this OTP, please ignore this email.</p>
          <p>© 2026 EV CHARGE PRO • Smart EV Infrastructure System</p>
        </div>
      </div>
    </body>
    </html>
  `;

  if (!transporter) {
    console.log(`\n==================================================`);
    console.log(`⚡ [DEV EMAIL OTP FALLBACK - Real credentials not configured]`);
    console.log(`TO: ${toEmail}`);
    console.log(`OTP CODE: ${otpCode}`);
    console.log(`VALIDITY: 5 minutes`);
    console.log(`NOTE: To send real Gmail emails, set EMAIL_USER and EMAIL_PASSWORD (16-character Google App Password) in backend/.env`);
    console.log(`==================================================\n`);
    return { sent: true, devMode: true };
  }

  try {
    const info = await transporter.sendMail({
      from: `"EV CHARGE PRO" <${process.env.EMAIL_USER}>`,
      to: toEmail,
      subject: "Your EV Charging Portal Login OTP",
      text: `⚡ EV CHARGING PORTAL - Your OTP code is ${otpCode}. Valid for 5 minutes. Do not share with anyone.`,
      html: htmlContent,
    });
    console.log(`[EMAIL OTP SENT] MessageId: ${info.messageId} to ${toEmail}`);
    return { sent: true, devMode: false, messageId: info.messageId };
  } catch (err) {
    console.error(`[EMAIL OTP FAILED] Error sending email to ${toEmail}:`, err.message);
    if (err.message.includes("535") || err.message.includes("BadCredentials") || err.message.includes("Username and Password not accepted")) {
      console.error(`👉 For Gmail, you must use a 16-character Google 'App Password' (not your normal Gmail account password).`);
      console.error(`👉 Generate one at: https://myaccount.google.com/apppasswords`);
    }
    // Dev fallback if SMTP fails
    console.log(`⚡ [DEV FALLBACK OTP DISPLAY] Code for ${toEmail}: ${otpCode}`);
    return { sent: true, devMode: true, error: err.message };
  }
};
