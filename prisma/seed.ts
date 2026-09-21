import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = (process.env.ADMIN_EMAIL || "sokhnamaifall50@gmail.com").toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "Admin1234";
  const name = process.env.ADMIN_NAME || "Accompagnatrice";

  const passwordHash = await bcrypt.hash(password, 10);

  const admin = await prisma.user.upsert({
    where: { email },
    update: { role: "ADMIN", name },
    create: { email, name, role: "ADMIN", passwordHash },
  });

  console.log(`✔ Compte administrateur prêt : ${admin.email}`);
  if (!process.env.ADMIN_PASSWORD) {
    console.log("  Mot de passe par défaut : Admin1234  (à changer !)");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
