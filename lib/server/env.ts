import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  AUTH_SECRET: z.string().min(1, "AUTH_SECRET is required."),
  AUTH_SIGNUP_AUTO_LOGIN_ENABLED: z.enum(["true", "false"]).default("false"),
  ANALYTICS_ADMIN_EMAILS: z.string().default(""),
});

const parsed = envSchema.safeParse({
  NODE_ENV: process.env.NODE_ENV,
  AUTH_SECRET: process.env.AUTH_SECRET,
  AUTH_SIGNUP_AUTO_LOGIN_ENABLED: process.env.AUTH_SIGNUP_AUTO_LOGIN_ENABLED,
  ANALYTICS_ADMIN_EMAILS: process.env.ANALYTICS_ADMIN_EMAILS,
});

if (!parsed.success) {
  throw new Error(`Invalid environment configuration: ${parsed.error.issues.map((i) => i.message).join("; ")}`);
}

const data = parsed.data;

const analyticsAdminEmails = new Set(
  data.ANALYTICS_ADMIN_EMAILS.split(",")
    .map((email) => email.trim().toLowerCase())
    .filter((email) => email.length > 0),
);

export const env = {
  NODE_ENV: data.NODE_ENV,
  AUTH_SECRET: data.AUTH_SECRET,
  AUTH_SIGNUP_AUTO_LOGIN_ENABLED: data.AUTH_SIGNUP_AUTO_LOGIN_ENABLED === "true",
  ANALYTICS_ADMIN_EMAILS: analyticsAdminEmails,
};

export function isAnalyticsAdmin(email: string) {
  return env.ANALYTICS_ADMIN_EMAILS.has(email.trim().toLowerCase());
}
