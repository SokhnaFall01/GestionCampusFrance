import { PrismaClient } from "@prisma/client";

// Un seul PrismaClient réutilisé (évite d'ouvrir trop de connexions en dev
// avec le rechargement à chaud de Next.js).
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
