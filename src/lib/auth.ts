import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { MongoClient } from "mongodb";
// 🌟 Import your shared email transporter configuration
import { transporter } from "@/lib/email"; // Adjust this import string based on your exact file name

const client = new MongoClient(process.env.MONGODB_URI!);
const db = client.db();

// In development Next.js may fall back to :3001, and people open the app via 127.0.0.1.
const devOrigins =
  process.env.NODE_ENV !== "production"
    ? ["localhost", "127.0.0.1"].flatMap((host) => [3000, 3001, 3002].map((port) => `http://${host}:${port}`))
    : [];
const trustedOrigins = Array.from(
  new Set([process.env.BETTER_AUTH_URL, process.env.NEXT_PUBLIC_APP_URL, ...devOrigins].filter(Boolean) as string[])
);

export const auth = betterAuth({
  database: mongodbAdapter(db),
  secret: process.env.BETTER_AUTH_SECRET!,
  baseURL: process.env.BETTER_AUTH_URL,
  trustedOrigins,

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    // Role-based sign-up goes through /api/register, which creates the account, sets the
    // role, and THEN the browser signs in — so the session always carries the final role.
    autoSignIn: false,
    sendResetPassword: async ({ user, url }) => {
      console.log("\n================ [PASSWORD RESET DISPATCH] ================");
      console.log(`Target User: ${user.email}`);
      console.log(`Reset URL: ${url}`);
      console.log("===========================================================\n");

      try {
        if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
          console.warn("[VendorVault] SMTP credentials not fully configured. Reset link logged above.");
          return;
        }

        await transporter.sendMail({
          from: `"VendorVault Security" <${process.env.SMTP_USER}>`,
          to: user.email,
          subject: "Reset Your VendorVault Password",
          html: `
            <div style="font-family: sans-serif; padding: 24px; color: #1c1917; max-width: 500px; margin: 0 auto; border: 1px solid #e4e4e7; border-radius: 12px; background-color: #ffffff;">
              <h2 style="color: #0f172a; margin-bottom: 8px; font-size: 20px;">Password Reset Request</h2>
              <p style="font-size: 14px; color: #475569; line-height: 1.5;">Hello,</p>
              <p style="font-size: 14px; color: #475569; line-height: 1.5;">We received a request to reset the password linked with your account. Click the secure link below to set up new credentials:</p>
              
              <div style="margin: 24px 0; text-align: center;">
                <a href="${url}" style="background-color: #10b981; color: #ffffff; padding: 10px 20px; font-size: 14px; font-weight: 600; text-decoration: none; border-radius: 6px; display: inline-block;">
                  Reset Password
                </a>
              </div>
              
              <p style="font-size: 12px; color: #94a3b8; line-height: 1.5; border-top: 1px solid #f1f5f9; padding-top: 16px;">
                If you didn't request this change, you can safely disregard this message. This security link expires shortly.
              </p>
            </div>
          `,
        });
        
        console.log(`[VendorVault] Password reset email safely dispatched to ${user.email}`);
      } catch (err: any) {
        console.error("[VendorVault] Failed to deliver reset email via SMTP (check Gmail App Password in .env):", err?.message || err);
        // Do not throw so better-auth succeeds and the link remains usable from server console
      }
    },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // refresh every 24h
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5,
    },
  },

  user: {
    additionalFields: {
      role: {
        type: "string",
        required: true,
        defaultValue: "STAFF",
        // SECURITY: must stay false. With `true`, anyone could call /api/auth/sign-up/email
        // with {"role":"ADMIN"} and make themselves an administrator. Roles are assigned
        // only by the server (/api/register) or by an admin.
        input: false,
      },
      vendorId: {
        type: "string",
        required: false,
        input: false, // only an admin links a SUPPLIER login to a Vendor record
      },
      phone: {
        type: "string",
        required: false,
        input: true,
      },
    },
  },
});

export type Session = typeof auth.$Infer.Session;