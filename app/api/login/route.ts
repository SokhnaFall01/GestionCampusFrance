import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { createSessionToken, sessionCookieOptions, SESSION_COOKIE } from "@/lib/auth";

// Connexion via une route dédiée : le cookie de session est posé directement
// sur la réponse de redirection, ce qui garantit son enregistrement par le
// navigateur (plus fiable qu'un cookie posé depuis une action serveur).
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const form = await request.formData();
  const email = String(form.get("email") || "").trim().toLowerCase();
  const password = String(form.get("password") || "");

  const fail = () => NextResponse.redirect(new URL("/login?error=1", request.url), 303);

  if (!email || !password) return fail();

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) return fail();

  const token = await createSessionToken({
    sub: user.id,
    role: user.role as "ADMIN" | "CANDIDATE",
    name: user.name,
    email: user.email,
  });

  const dest = user.role === "ADMIN" ? "/admin" : "/candidat";
  const res = NextResponse.redirect(new URL(dest, request.url), 303);
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
  return res;
}
