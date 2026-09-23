import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSessionToken, sessionCookieOptions, SESSION_COOKIE } from "@/lib/auth";

// Diagnostic : pose le VRAI cookie de session (pour l'admin) exactement comme
// à la connexion, puis redirige vers /api/whoami pour voir s'il est bien reçu.
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const admin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  if (!admin) {
    return NextResponse.json({ ok: false, error: "Aucun admin en base." });
  }
  const token = await createSessionToken({
    sub: admin.id,
    role: "ADMIN",
    name: admin.name,
    email: admin.email,
  });
  const res = NextResponse.redirect(new URL("/api/whoami", request.url), 303);
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());

  // Sondes de diagnostic (Lax + secure + httpOnly, comme gcf_session) :
  // - valeur courte AVEC maxAge
  res.cookies.set("probe_short_maxage", "x", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 604800,
  });
  // - valeur LONGUE SANS maxAge
  res.cookies.set("probe_long_nomaxage", "y".repeat(320), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
  });
  // - valeur LONGUE AVEC maxAge (comme gcf_auth)
  res.cookies.set("probe_long_maxage", "z".repeat(320), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 604800,
  });
  // - la valeur JWT EXACTE, avec les options du cookie de session
  res.cookies.set("probe_jwtval", token, sessionCookieOptions());
  return res;
}
