#!/bin/sh
set -e

echo "⏳ Attente de la base de données…"
# Petite attente que PostgreSQL soit prêt (retries)
i=0
until npx prisma db push --skip-generate >/tmp/dbpush.log 2>&1; do
  i=$((i+1))
  if [ "$i" -ge 30 ]; then
    echo "❌ Base indisponible après plusieurs tentatives :"
    cat /tmp/dbpush.log
    exit 1
  fi
  echo "   …nouvelle tentative ($i)"
  sleep 2
done
echo "✔ Schéma synchronisé."

echo "🌱 Initialisation (compte admin + étapes + documents)…"
npx tsx prisma/seed.ts || echo "⚠ seed ignoré (déjà initialisé ?)"

echo "🚀 Démarrage du serveur…"
exec npm run start
