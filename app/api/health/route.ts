import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Exécutée à la demande uniquement (jamais pendant le build).
export const dynamic = "force-dynamic";

// Route de diagnostic : vérifie la connexion à la base de données et indique
// si les données de base (compte admin, étapes, documents) sont présentes.
// Utile pour diagnostiquer un déploiement. N'expose aucune donnée sensible.
export async function GET() {
  try {
    const [users, admins, stages, documentTypes, candidates] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: "ADMIN" } }),
      prisma.stage.count(),
      prisma.documentType.count(),
      prisma.candidate.count(),
    ]);
    return NextResponse.json({
      ok: true,
      database: "connectée",
      users,
      admins,
      stages,
      documentTypes,
      candidates,
      hint:
        admins === 0
          ? "Aucun compte admin : le seed n'a pas été exécuté."
          : stages === 0 || documentTypes === 0
            ? "Compte admin présent mais étapes/documents manquants : relancer le seed."
            : "Base initialisée correctement.",
    });
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        database: "erreur",
        error: e instanceof Error ? e.message : String(e),
      },
      { status: 500 },
    );
  }
}
