# 🇫🇷 Gestion Campus France

Application web pour accompagner des étudiants sénégalais dans leur procédure
**Campus France** : gestion des dossiers, suivi des étapes, actions à faire,
dépôt de documents par les candidats, et **calcul d'une probabilité d'admission**
avant acceptation d'un dossier.

## ✨ Fonctionnalités

### Espace accompagnatrice (admin)
- Tableau de bord : liste des étudiants, statistiques (suivis, à évaluer, acceptés, actions en attente)
- Création d'un compte étudiant (identifiants générés à transmettre)
- **Paramètres** : ajout / renommage / suppression des étapes de la procédure et
  des types de documents demandés (un nouveau document est automatiquement
  ajouté à la checklist de tous les étudiants)
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
- **Prisma 6** + **PostgreSQL** (Supabase)
- **Supabase Storage** pour les fichiers déposés (disque local en dev)
- Authentification par cookie de session signé (JWT via `jose`, mots de passe hachés avec `bcryptjs`)

## 🚀 Démarrage en local

```bash
# 1. Installer les dépendances
npm install

# 2. Créer le fichier .env (voir ci-dessous)

# 3. Créer / synchroniser la base de données
npm run db:push

# 4. Créer le compte administrateur + données par défaut
npm run db:seed

# 5. Lancer
npm run dev
```

Ouvrir http://localhost:3000

### Fichier `.env`
Copier `.env.example` en `.env` et renseigner les valeurs (voir ce fichier pour
le détail). Il faut au minimum `DATABASE_URL`, `DIRECT_URL` (PostgreSQL) et
`AUTH_SECRET`.

### Compte administrateur par défaut
- **Email** : `sokhnamaifall50@gmail.com`
- **Mot de passe** : `Admin1234` ⚠️ *à changer* (définir `ADMIN_PASSWORD`)

Pour définir vos propres identifiants au moment du seed :
```bash
ADMIN_EMAIL="vous@exemple.com" ADMIN_PASSWORD="MotDePasseFort" npm run db:seed
```

## 🌐 Mise en ligne (Vercel + Supabase)

L'application est prête pour un déploiement **Vercel** (hébergement) +
**Supabase** (base PostgreSQL + stockage des fichiers).

1. **Supabase** : créer un projet. Récupérer :
   - la **connection string** (pooler → `DATABASE_URL`, directe → `DIRECT_URL`) ;
   - l'**URL du projet** et la **clé service_role** (Project Settings → API) pour
     `SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY`.
   Le bucket privé `documents` est créé automatiquement au premier envoi.
2. **Vercel** : importer le dépôt GitHub, puis définir les variables
   d'environnement (onglet *Settings → Environment Variables*) :
   `DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET`, `SUPABASE_URL`,
   `SUPABASE_SERVICE_ROLE_KEY`, et (recommandé) `ADMIN_EMAIL` + `ADMIN_PASSWORD`.
3. Déployer. Le script de build lance automatiquement `prisma db push`
   (création des tables) puis le seed (compte admin + étapes/documents par
   défaut) avant de construire le site.

> Le stockage bascule tout seul : si `SUPABASE_URL` et
> `SUPABASE_SERVICE_ROLE_KEY` sont définis, les fichiers vont dans Supabase
> Storage ; sinon ils sont écrits sur le disque local (`UPLOAD_DIR`).

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
