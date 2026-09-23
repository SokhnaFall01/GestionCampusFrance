import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import { prisma } from "./prisma";

export const SESSION_COOKIE = "gcf_session";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 jours

function secretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET manquant dans l'environnement (.env)");
  return new TextEncoder().encode(secret);
}

export interface SessionPayload {
  sub: string; // userId
  role: "ADMIN" | "CANDIDATE";
  name: string;
  email: string;
}

// Options du cookie de session (partagées entre la route /api/login et ailleurs).
export function sessionCookieOptions() {
  const insecure = process.env.AUTH_INSECURE_COOKIE === "true";
  const secure = process.env.NODE_ENV === "production" && !insecure;
  return {
    httpOnly: true,
    // En production (HTTPS) : SameSite=None + Secure, pour que le cookie soit
    // aussi transmis lors des envois de formulaires (actions serveur), que le
    // navigateur peut classer « cross-site ». En dev/HTTP : Lax.
    secure,
    sameSite: (secure ? "none" : "lax") as "none" | "lax",
    path: "/",
    maxAge: MAX_AGE,
  };
}

// Génère le jeton de session signé (JWT).
export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ role: payload.role, name: payload.name, email: payload.email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secretKey());
}

export async function createSession(payload: SessionPayload): Promise<void> {
  const token = await createSessionToken(payload);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, sessionCookieOptions());
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    return {
      sub: payload.sub as string,
      role: payload.role as "ADMIN" | "CANDIDATE",
      name: payload.name as string,
      email: payload.email as string,
    };
  } catch {
    return null;
  }
}

// Renvoie l'admin connecté, ou redirige vers /login.
export async function requireAdmin(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect("/candidat");
  return session;
}

// Renvoie le candidat connecté (avec sa fiche), ou redirige.
export async function requireCandidate() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "CANDIDATE") redirect("/admin");
  const candidate = await prisma.candidate.findUnique({
    where: { userId: session.sub },
  });
  if (!candidate) redirect("/login");
  return { session, candidate };
}
