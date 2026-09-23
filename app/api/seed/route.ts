import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { hashPassword } from "@/lib/password";
import { DEFAULT_STAGES, DEFAULT_DOCUMENTS } from "@/lib/defaults";

// Initialise la base depuis le navigateur (compte admin + étapes + documents),
// indépendamment du build. Sécurité :
// - si aucun admin n'existe encore : accès libre (amorçage d'une base neuve) ;
// - sinon : réservé à un admin connecté (pour relancer / compléter).
export async function GET() {
  try {
    const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });

    if (adminCount > 0) {
      const session = await getSession();
      if (!session || session.role !== "ADMIN") {
        return NextResponse.json(
          {
            ok: false,
            error:
              "Base déjà initialisée. Connectez-vous en administrateur pour relancer l'initialisation.",
          },
          { status: 403 },
        );
      }
    }

    const email = (process.env.ADMIN_EMAIL || "sokhnamaifall50@gmail.com").toLowerCase();
    const password = process.env.ADMIN_PASSWORD || "Admin1234";
    const name = process.env.ADMIN_NAME || "Accompagnatrice";
    const passwordHash = await hashPassword(password);

    const admin = await prisma.user.upsert({
      where: { email },
      update: { role: "ADMIN", name, passwordHash },
      create: { email, name, role: "ADMIN", passwordHash },
    });

    let stagesCreated = 0;
    if ((await prisma.stage.count()) === 0) {
      await prisma.stage.createMany({
        data: DEFAULT_STAGES.map((label, i) => ({ label, order: i + 1 })),
      });
      stagesCreated = DEFAULT_STAGES.length;
    }

    let documentTypesCreated = 0;
    if ((await prisma.documentType.count()) === 0) {
      await prisma.documentType.createMany({
        data: DEFAULT_DOCUMENTS.map((label, i) => ({ label, order: i + 1 })),
      });
      documentTypesCreated = DEFAULT_DOCUMENTS.length;
    }

    return NextResponse.json({
      ok: true,
      admin: admin.email,
      passwordReset: Boolean(process.env.ADMIN_PASSWORD),
      stagesCreated,
      documentTypesCreated,
      message: "Initialisation terminée.",
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
