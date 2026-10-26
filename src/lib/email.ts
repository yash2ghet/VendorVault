import nodemailer, { type Transporter } from "nodemailer";

/**
 * Gmail setup checklist (the #1 reason "email not coming"):
 *   1. Turn on 2-Step Verification for the Google account in SMTP_USER.
 *   2. Create an *App password* (Google Account → Security → App passwords).
 *   3. Put that 16-character password (no spaces) in SMTP_PASS. Your normal
 *      Gmail password will NOT work.
 *   4. Run `npm run test:smtp` — it tells you exactly what is wrong.
 */
let cached: Transporter | null = null;

export function isSmtpConfigured() {
  return Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);
}

export function getTransporter(): Transporter {
  if (cached) return cached;

  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  cached = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port,
    secure: port === 465,        // 465 = implicit TLS, 587 = STARTTLS
    requireTLS: port !== 465,
    auth: {
      user: process.env.SMTP_USER,
      // Google shows app passwords as "abcd efgh ijkl mnop" — strip spaces just in case.
      pass: (process.env.SMTP_PASS || "").replace(/\s+/g, ""),
    },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });
  return cached;
}

/** Kept so older imports (`import { transporter } from "@/lib/email"`) keep working. */
export const transporter = new Proxy({} as Transporter, {
  get: (_t, prop) => (getTransporter() as any)[prop],
});

export function escapeHtml(input: unknown) {
  return String(input ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function explainSmtpError(error: any): string {
  const code = error?.code as string | undefined;
  if (code === "EAUTH" || error?.responseCode === 535) {
    return "SMTP login rejected. For Gmail you must use a 16-character App Password (needs 2-Step Verification), not your normal password.";
  }
  if (code === "ETIMEDOUT" || code === "ECONNECTION" || code === "ESOCKET" || code === "ECONNREFUSED") {
    return `Could not reach the SMTP server (${process.env.SMTP_HOST}:${process.env.SMTP_PORT}). Check internet/firewall/VPN, or try port 465.`;
  }
  if (code === "EENVELOPE") return "The recipient address was rejected by the mail server.";
  return error?.message || "Unknown SMTP error";
}

interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  fromName?: string;
}

export async function sendEmail({ to, subject, html, fromName = "VendorVault" }: SendEmailInput) {
  if (!isSmtpConfigured()) {
    const message = "SMTP_USER / SMTP_PASS are not set in .env — email was not sent.";
    console.error(`[email] ${message}`);
    return { success: false as const, error: message };
  }

  try {
    const info = await getTransporter().sendMail({
      from: `"${fromName}" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    });
    console.log(`[email] sent "${subject}" to ${to} (id ${info.messageId})`);
    return { success: true as const };
  } catch (error: any) {
    const message = explainSmtpError(error);
    console.error(`[email] FAILED to send "${subject}" to ${to}: ${message}`, error?.code ? `[${error.code}]` : "");
    return { success: false as const, error: message };
  }
}

interface SendStatusEmailInput {
  toEmail: string;
  employeeName: string;
  assetType: string;
  status: "APPROVED_BY_MANAGER" | "REJECTED";
  feedback: string;
}

export async function sendRequestStatusEmail({
  toEmail,
  employeeName,
  assetType,
  status,
  feedback,
}: SendStatusEmailInput) {
  // If credentials aren't set yet, skip sending instead of crashing the app
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn("SMTP credentials missing. Email dispatch skipped.");
    return { success: false, error: "SMTP credentials not configured." };
  }

  try {
    const isApproved = status === "APPROVED_BY_MANAGER";
    
    await getTransporter().sendMail({
      from: `"VendorVault Procurement" <${process.env.SMTP_USER}>`,
      to: toEmail,
      subject: `Hardware Request Update: ${isApproved ? "Approved" : "Rejected"}`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e4e4e7; rounded-xl">
          <h2 style="color: #111;">Hello ${escapeHtml(employeeName)},</h2>
          <p>There has been an update regarding your procurement pipeline request for a <strong>${escapeHtml(assetType)}</strong>.</p>
          
          <div style="margin: 20px 0; padding: 15px; border-left: 4px solid ${isApproved ? "#10b981" : "#ef4444"}; background-color: #f9f9f9; border-radius: 4px;">
            <p style="margin: 0 0 8px 0;"><strong>Status:</strong> ${isApproved ? "Approved by Manager" : "Rejected"}</p>
            <p style="margin: 0;"><strong>Manager Review Notes:</strong> ${escapeHtml(feedback)}</p>
          </div>
          
          <p style="font-size: 13px; color: #71717a;">Log into your dashboard to track further fulfillment updates.</p>
        </div>
      `,
    });

    return { success: true };
  } catch (error) {
    console.error("Failed to trigger email notification dispatch via Nodemailer:", error);
    return { success: false, error };
  }
}

/**
 * Finds a user's email by their Better-Auth id. Better-Auth's Mongo adapter
 * stores users in the "user" collection; the Mongoose User model reads "users",
 * so both are checked to be safe.
 */
export async function getUserEmailById(userId: string): Promise<string | null> {
  try {
    const mongoose = (await import("mongoose")).default;
    const { connectDB } = await import("@/lib/mongodb");
    await connectDB();
    const db = mongoose.connection.db;
    if (!db) return null;

    const ids: any[] = [userId];
    if (mongoose.isValidObjectId(userId)) ids.push(new mongoose.Types.ObjectId(userId));

    for (const name of ["user", "users"]) {
      const doc = await db.collection(name).findOne({ $or: [{ _id: { $in: ids } }, { id: userId }] } as any);
      if (doc?.email) return String(doc.email);
    }
  } catch (error) {
    console.error("[email] could not look up user email:", error);
  }
  return null;
}
