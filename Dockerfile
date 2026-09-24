# Image de l'application (Next.js + Prisma)
FROM node:20-bookworm-slim

# openssl est requis par Prisma
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Installer les dépendances (le postinstall lance `prisma generate`,
# d'où la copie préalable du schéma Prisma).
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

# Copier le reste du code puis construire (sans toucher à la base : la synchro
# du schéma se fait au démarrage, quand la base est disponible).
COPY . .
RUN npx next build

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

# Au démarrage : synchro du schéma + seed + lancement du serveur.
CMD ["sh", "docker/entrypoint.sh"]
