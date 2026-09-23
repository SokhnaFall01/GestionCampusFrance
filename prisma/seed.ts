import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { DEFAULT_STAGES, DEFAULT_DOCUMENTS } from "../lib/defaults";

// Au moment du seed (build/déploiement), on privilégie la connexion directe
// (DIRECT_URL) plutôt que le pooler, plus fiable pour les écritures.
const seedUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;
const prisma = new PrismaClient(
  seedUrl ? { datasources: { db: { url: seedUrl } } } : undefined,
);

async function main() {
  // --- Compte administrateur ---
  const email = (process.env.ADMIN_EMAIL || "sokhnamaifall50@gmail.com").toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "Admin1234";
  const name = process.env.ADMIN_NAME || "Accompagnatrice";
  const passwordHash = await bcrypt.hash(password, 10);

  // Si ADMIN_PASSWORD est explicitement défini, on (ré)initialise aussi le mot
  // de passe à chaque exécution : cela permet de le changer via Vercel puis de
  // redéployer. Sinon, on ne touche pas au mot de passe d'un compte existant.
  const resetPassword = Boolean(process.env.ADMIN_PASSWORD);

  const admin = await prisma.user.upsert({
    where: { email },
    update: resetPassword ? { role: "ADMIN", name, passwordHash } : { role: "ADMIN", name },
    create: { email, name, role: "ADMIN", passwordHash },
  });
  console.log(`✔ Compte administrateur prêt : ${admin.email}`);
  console.log(
    resetPassword
      ? "  Mot de passe défini depuis ADMIN_PASSWORD."
      : "  Mot de passe par défaut : Admin1234  (définir ADMIN_PASSWORD pour le changer).",
  );

  // --- Étapes par défaut (seulement si aucune n'existe) ---
  if ((await prisma.stage.count()) === 0) {
    await prisma.stage.createMany({
      data: DEFAULT_STAGES.map((label, i) => ({ label, order: i + 1 })),
    });
    console.log(`✔ ${DEFAULT_STAGES.length} étapes créées`);
  }

  // --- Types de documents par défaut (seulement si aucun n'existe) ---
  if ((await prisma.documentType.count()) === 0) {
    await prisma.documentType.createMany({
      data: DEFAULT_DOCUMENTS.map((label, i) => ({ label, order: i + 1 })),
    });
    console.log(`✔ ${DEFAULT_DOCUMENTS.length} types de documents créés`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
