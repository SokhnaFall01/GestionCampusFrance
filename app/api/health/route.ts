import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Exécutée à la demande uniquement (jamais pendant le build).
export const dynamic = "force-dynamic";

// Route de diagnostic : commit déployé, connexion base, présence des données,
// et existence de la table des sessions.
export async function GET() {
  const commit = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || "inconnu";

  let sessionsTable = "?";
  try {
    const n = await prisma.session.count();
    sessionsTable = `OK (${n})`;
  } catch (e) {
    sessionsTable = `ERREUR: ${e instanceof Error ? e.message.slice(0, 120) : String(e)}`;
  }

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
      commit,
      database: "connectée",
      sessionsTable,
      users,
      admins,
      stages,
      documentTypes,
      candidates,
    });
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        commit,
        database: "erreur",
        sessionsTable,
        error: e instanceof Error ? e.message : String(e),
      },
      { status: 500 },
    );
  }
}
