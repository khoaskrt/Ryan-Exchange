import { compare, hash } from "bcryptjs";
import { jwtVerify, SignJWT } from "jose";

import { env } from "@/lib/server/env";

export const SESSION_COOKIE_NAME = "kv_session";

const encoder = new TextEncoder();
export const SESSION_EXPIRES_IN_SECONDS = 60 * 60 * 24 * 7;

type SessionPayload = {
  sub: string;
  email: string;
  name: string;
};

function getAuthSecret() {
  return env.AUTH_SECRET;
}

export async function hashPassword(password: string) {
  return hash(password, 12);
}

export async function verifyPassword(password: string, passwordHash: string) {
  return compare(password, passwordHash);
}

export async function createSessionToken(payload: SessionPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_EXPIRES_IN_SECONDS}s`)
    .sign(encoder.encode(getAuthSecret()));
}

export async function verifySessionToken(token: string) {
  const result = await jwtVerify<SessionPayload>(token, encoder.encode(getAuthSecret()));
  return result.payload;
}

export const sessionCookieConfig = {
  name: SESSION_COOKIE_NAME,
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: SESSION_EXPIRES_IN_SECONDS,
};
