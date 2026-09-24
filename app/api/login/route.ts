import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { createDbSession, sessionCookieOptions, SESSION_COOKIE, LEGACY_COOKIES } from "@/lib/auth";

// Connexion via une route dédiée : le cookie de session est posé directement
// sur la réponse de redirection, ce qui garantit son enregistrement par le
// navigateur (plus fiable qu'un cookie posé depuis une action serveur).
export const dynamic = "force-dynamic";

// Redirection RELATIVE (Location: /chemin) : indispensable derrière un proxy,
// pour rester sur le domaine public au lieu de l'adresse interne (localhost).
function redirectTo(path: string): NextResponse {
  return new NextResponse(null, { status: 303, headers: { Location: path } });
}

export async function POST(request: Request) {
  const form = await request.formData();
  const email = String(form.get("email") || "").trim().toLowerCase();
  const password = String(form.get("password") || "");

  if (!email || !password) return redirectTo("/login?error=1");

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return redirectTo("/login?error=1");
  }

  const sid = await createDbSession(user.id);

  const dest = user.role === "ADMIN" ? "/admin" : "/candidat";
  const res = redirectTo(dest);
  res.cookies.set(SESSION_COOKIE, sid, sessionCookieOptions());
  // Ménage des cookies parasites accumulés lors des tests.
  for (const name of LEGACY_COOKIES) res.cookies.set(name, "", { path: "/", maxAge: 0 });
  return res;
}
