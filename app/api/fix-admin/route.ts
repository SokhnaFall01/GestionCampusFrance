import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";

// OUTIL TEMPORAIRE DE DÉPANNAGE — à supprimer après diagnostic.
// Réinitialise le compte administrateur avec un mot de passe connu, pour
// vérifier si le problème vient du mot de passe ou de la session.
// Protégé par une clé simple dans l'URL (?key=...).
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
    return NextResponse.json({
      ok: true,
      email: admin.email,
      motDePasse: KNOWN_PASSWORD,
      message: "Mot de passe admin réinitialisé. Connecte-toi avec ces identifiants.",
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
