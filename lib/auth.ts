import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "./prisma";

export const SESSION_COOKIE = "sid";

// Cookies parasites accumulés lors des tests, à nettoyer côté navigateur.
export const LEGACY_COOKIES = [
  "testplain",
  "testsecure",
  "probe_short_maxage",
  "probe_long_nomaxage",
  "probe_long_maxage",
  "probe_jwtval",
  "gcf_session",
  "gcf_auth",
  "gcf_sid",
];
const MAX_AGE = 60 * 60 * 24 * 7; // 7 jours

export interface SessionPayload {
  sub: string; // userId
  role: "ADMIN" | "CANDIDATE";
  name: string;
  email: string;
}

// Options du cookie de session. Le cookie ne contient qu'un identifiant court
// (l'id de la session en base) — plus fiable qu'un long jeton, notamment lors
// des envois de formulaires (actions serveur).
export function sessionCookieOptions() {
  // "secure" désactivé par défaut pour fonctionner aussi bien en http qu'en
  // https (un cookie "Secure" est ignoré par le navigateur hors HTTPS, ce qui
  // déconnecte l'utilisateur). Pour forcer Secure en HTTPS, définir
  // AUTH_SECURE_COOKIE=true.
  const secure = process.env.AUTH_SECURE_COOKIE === "true";
  return {
    httpOnly: true,
    secure,
    sameSite: "lax" as const,
    path: "/",
    maxAge: MAX_AGE,
  };
}

// Crée une session en base et renvoie son id (valeur du cookie).
export async function createDbSession(userId: string): Promise<string> {
  const expiresAt = new Date(Date.now() + MAX_AGE * 1000);
  const session = await prisma.session.create({ data: { userId, expiresAt } });
  return session.id;
}

// Pose le cookie de session (utilisé côté serveur si besoin).
export async function createSession(userId: string): Promise<void> {
  const sid = await createDbSession(userId);
  const store = await cookies();
  store.set(SESSION_COOKIE, sid, sessionCookieOptions());
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  const sid = store.get(SESSION_COOKIE)?.value;
  if (sid) {
    await prisma.session.delete({ where: { id: sid } }).catch(() => {});
  }
  store.delete(SESSION_COOKIE);
}

// Récupère l'id de session brut (valeur du cookie) — utile pour l'injecter
// dans les formulaires (champ caché), car le cookie n'est pas toujours transmis
// lors des envois de formulaires sur certains hébergements.
export async function getSessionId(): Promise<string | null> {
  const store = await cookies();
  return store.get(SESSION_COOKIE)?.value ?? null;
}

// Résout une session à partir de son id (cookie OU champ de formulaire).
export async function getSessionFromId(sid: string | null | undefined): Promise<SessionPayload | null> {
  if (!sid) return null;
  const session = await prisma.session.findUnique({
    where: { id: sid },
    include: { user: true },
  });
  if (!session || session.expiresAt < new Date()) return null;
  return {
    sub: session.user.id,
    role: session.user.role as "ADMIN" | "CANDIDATE",
    name: session.user.name,
    email: session.user.email,
  };
}

export async function getSession(): Promise<SessionPayload | null> {
  return getSessionFromId(await getSessionId());
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
