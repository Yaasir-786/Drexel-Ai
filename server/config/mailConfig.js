import nodemailer from "nodemailer";

let transporter = null;

// returns null when SMTP is not configured (reset link is then logged in development)
const getTransporter = () => {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) return null;

  if (!transporter) {
    const port = Number(process.env.SMTP_PORT) || 465;
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port,
      secure: port === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }

  return transporter;
};

export default getTransporter;
