import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { createDbSession, sessionCookieOptions, SESSION_COOKIE } from "@/lib/auth";

// OUTIL TEMPORAIRE DE DÉPANNAGE — à supprimer après diagnostic.
// Réinitialise le mot de passe admin ET connecte directement (pose le cookie
// de session sur la réponse, puis redirige vers le tableau de bord).
export const dynamic = "force-dynamic";

const TEMP_KEY = "repare-2026";
const KNOWN_PASSWORD = "CampusFrance2026";

export async function GET(request: Request) {
  const key = new URL(request.url).searchParams.get("key");
  if (key !== TEMP_KEY) {
    return NextResponse.json({ ok: false, error: "Clé invalide." }, { status: 403 });
  }

  try {
    const email = (process.env.ADMIN_EMAIL || "sokhnamaifall50@gmail.com").toLowerCase();
    const passwordHash = await hashPassword(KNOWN_PASSWORD);
    const admin = await prisma.user.upsert({
      where: { email },
      update: { role: "ADMIN", passwordHash },
      create: { email, name: "Accompagnatrice", role: "ADMIN", passwordHash },
    });

    // Connecte directement : pose le cookie de session sur la redirection.
    const sid = await createDbSession(admin.id);
    const res = NextResponse.redirect(new URL("/admin", request.url), 303);
    res.cookies.set(SESSION_COOKIE, sid, sessionCookieOptions());
    return res;
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
