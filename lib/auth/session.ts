import { cookies } from "next/headers";
import { jwtVerify, SignJWT } from "jose";
import { env } from "@/lib/env";

const COOKIE_NAME = "emmadrid_session";
const SESSION_TTL = 60 * 60 * 8;

function secret() {
  if (!env.SESSION_SECRET) throw new Error("SESSION_SECRET is not configured");
  return new TextEncoder().encode(env.SESSION_SECRET);
}

export async function createSession() {
  const token = await new SignJWT({ role: "administrator" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL}s`)
    .setSubject("administrator")
    .sign(secret());
  (await cookies()).set(COOKIE_NAME, token, {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax",
    maxAge: SESSION_TTL, path: "/",
  });
}

export async function getSession() {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token || !env.SESSION_SECRET) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload.sub === "administrator" ? payload : null;
  } catch {
    return null;
  }
}

export async function requireSession() {
  const session = await getSession();
  if (!session) throw new Error("UNAUTHORIZED");
  return session;
}

export async function destroySession() {
  (await cookies()).delete(COOKIE_NAME);
}
