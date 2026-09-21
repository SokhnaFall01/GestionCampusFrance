# 🇫🇷 Gestion Campus France

Application web pour accompagner des étudiants sénégalais dans leur procédure
**Campus France** : gestion des dossiers, suivi des étapes, actions à faire,
dépôt de documents par les candidats, et **calcul d'une probabilité d'admission**
avant acceptation d'un dossier.

## ✨ Fonctionnalités

### Espace accompagnatrice (admin)
- Tableau de bord : liste des étudiants, statistiques (suivis, à évaluer, acceptés, actions en attente)
- Création d'un compte étudiant (identifiants générés à transmettre)
- Dossier complet par étudiant :
  - Étape de la procédure (10 étapes, du premier contact au départ)
  - Documents (validation / refus avec motif)
  - Actions à faire (to-do avec échéances)
  - Journal de suivi (historique horodaté)
  - **Évaluation & probabilité d'admission**
  - Décision : accepté / refusé / en attente
  - Notes privées
- Limite de **10 apprenants** par an

### Espace candidat
- Connexion avec les identifiants fournis par l'accompagnatrice
- Suivi de l'avancement de son dossier
- **Dépôt de fichiers** directement (PDF ou image, 10 Mo max)
- Saisie de ses vœux (« ce qu'il veut étudier »)
- Liste des actions à réaliser

### Probabilité d'admission
Note sur 100 calculée à partir de 4 critères pondérés :

| Critère | Poids |
|---|---|
| Moyenne / mentions (Bac + post-bac) | 31 % |
| Niveau de français (TCF/DELF) | 25 % |
| Cohérence parcours ↔ formation visée | 25 % |
| Sélectivité de la formation choisie | 19 % |

Résultat : 🟢 Élevée (≥ 70) · 🟡 Moyenne (40-69) · 🔴 Faible (< 40), avec le
détail par critère. Les critères non renseignés sont ignorés (les poids sont
re-normalisés) pour rester exploitable sur un dossier incomplet.
La logique est isolée dans `lib/scoring.ts` — les poids et barèmes y sont
faciles à ajuster.

## 🧱 Stack technique
- **Next.js 16** (App Router) + **React** + **TypeScript**
- **Tailwind CSS**
- **Prisma 6** + **SQLite** (dev) → **PostgreSQL** (production)
- Authentification par cookie de session signé (JWT via `jose`, mots de passe hachés avec `bcryptjs`)

## 🚀 Démarrage en local

```bash
# 1. Installer les dépendances
npm install

# 2. Créer le fichier .env (voir ci-dessous)

# 3. Créer la base de données
npx prisma migrate dev

# 4. Créer le compte administrateur
npm run db:seed

# 5. Lancer
npm run dev
```

Ouvrir http://localhost:3000

### Fichier `.env`
```
DATABASE_URL="file:./dev.db"
AUTH_SECRET="une-longue-chaine-aleatoire"   # générer avec: openssl rand -hex 32
UPLOAD_DIR="./uploads"
```

### Compte administrateur par défaut
- **Email** : `sokhnamaifall50@gmail.com`
- **Mot de passe** : `Admin1234` ⚠️ *à changer* (voir ci-dessous)

Pour définir vos propres identifiants au moment du seed :
```bash
ADMIN_EMAIL="vous@exemple.com" ADMIN_PASSWORD="MotDePasseFort" npm run db:seed
```

## 🌐 Mise en ligne (production)

1. **Base de données PostgreSQL** (Neon, Supabase, Railway… offres gratuites) :
   dans `prisma/schema.prisma`, remplacer `provider = "sqlite"` par
   `provider = "postgresql"`, mettre l'URL Postgres dans `DATABASE_URL`, puis
   `npx prisma migrate deploy` et `npm run db:seed`.
2. **Variables d'environnement** : définir `AUTH_SECRET` (secret fort) et
   `DATABASE_URL`.
3. **Stockage des fichiers déposés** :
   - Sur un serveur avec disque persistant (VPS, Railway, Render), le stockage
     disque local (`UPLOAD_DIR`) suffit.
   - Sur une plateforme *serverless* (Vercel), le disque n'est pas persistant :
     il faudra brancher un stockage objet (Supabase Storage / S3) en adaptant
     `lib/storage.ts`. C'est l'étape suivante prévue.
4. Sur HTTP sans HTTPS (auto-hébergement), définir `AUTH_INSECURE_COOKIE=true`
   pour autoriser le cookie de session. En HTTPS, ne pas définir cette variable.

## 📁 Structure
```
app/
  login/            Connexion
  admin/            Espace accompagnatrice (dashboard, dossiers, création)
  candidat/         Espace candidat (documents, vœux, suivi)
  api/documents/    Téléchargement sécurisé des fichiers
lib/
  auth.ts           Sessions & contrôle d'accès
  prisma.ts         Client base de données
  scoring.ts        Calcul de la probabilité d'admission
  storage.ts        Stockage des fichiers
  constants.ts      Référentiels métier (étapes, documents, barèmes)
components/         Composants d'interface réutilisables
prisma/
  schema.prisma     Modèle de données
  seed.ts           Création du compte admin
```
