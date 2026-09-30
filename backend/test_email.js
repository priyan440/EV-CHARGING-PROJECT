import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import nodemailer from "nodemailer";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, ".env") });

console.log("Loaded EMAIL_USER:", process.env.EMAIL_USER);
console.log("Loaded EMAIL_PASSWORD length:", (process.env.EMAIL_PASSWORD || "").length);

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

try {
  console.log("Verifying connection to Gmail...");
  await transporter.verify();
  console.log("✅ SUCCESS: Gmail SMTP connected and verified!");
  
  const info = await transporter.sendMail({
    from: `"EV CHARGE PRO" <${process.env.EMAIL_USER}>`,
    to: process.env.EMAIL_USER,
    subject: "⚡ EV CHARGE PRO - Test OTP Delivery",
    text: "Your EV Charging Portal test OTP is 849201. Your email setup is working perfectly!",
  });
  console.log("✅ SUCCESS: Test email sent to", process.env.EMAIL_USER, "MessageId:", info.messageId);
} catch (err) {
  console.error("❌ FAILED to send email:", err.message);
}
