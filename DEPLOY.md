# Déploiement sur votre VPS (avec Docker)

Ce guide installe l'application sur votre serveur avec **HTTPS automatique**.
Tout est conteneurisé : l'application, la base PostgreSQL, et le serveur web
(Caddy) qui gère le certificat HTTPS tout seul.

## Ce qu'il vous faut
- Un VPS (Ubuntu/Debian recommandé) avec accès **SSH**.
- Un **nom de domaine** dont l'enregistrement DNS **A** pointe vers l'**IP** du VPS.
- Les ports **80** et **443** ouverts sur le serveur.

---

## 1. Faire pointer le domaine vers le serveur
Chez votre fournisseur de domaine, créez un enregistrement **A** :
`campus.votredomaine.com` → `IP_DE_VOTRE_VPS`
(attendez quelques minutes que ça se propage).

## 2. Se connecter au serveur en SSH
```bash
ssh root@IP_DE_VOTRE_VPS
```

## 3. Installer Docker (une seule fois)
```bash
curl -fsSL https://get.docker.com | sh
```

## 4. Récupérer le code
```bash
git clone https://github.com/SokhnaFall01/GestionCampusFrance.git
cd GestionCampusFrance
git checkout claude/trusting-bohr-viapce
```
> Dépôt privé : Git demandera votre identifiant GitHub et un **token** (mot de
> passe d'application GitHub). Vous pouvez aussi rendre le dépôt public le temps
> du clone.

## 5. Configurer les variables
```bash
cp .env.docker.example .env
nano .env
```
Renseignez :
- `DOMAIN` = votre domaine (ex : `campus.votredomaine.com`, sans `https://`)
- `POSTGRES_PASSWORD` = un mot de passe solide (lettres + chiffres)
- `ADMIN_PASSWORD` = votre mot de passe de connexion au site
- (`AUTH_SECRET` est déjà rempli, `ADMIN_EMAIL` aussi)

Enregistrez dans nano : `Ctrl+O`, `Entrée`, puis `Ctrl+X`.

## 6. Démarrer
```bash
docker compose up -d --build
```
La première fois, la construction prend quelques minutes. Ensuite, l'application
crée automatiquement les tables, votre compte admin et les étapes/documents par
défaut.

## 7. Ouvrir le site
Rendez-vous sur **https://votre-domaine** → connectez-vous avec votre email et
`ADMIN_PASSWORD`. 🎉

---

## Commandes utiles
- Voir les journaux : `docker compose logs -f app`
- Redémarrer : `docker compose restart`
- Mettre à jour après un changement de code :
  ```bash
  git pull
  docker compose up -d --build
  ```
- Tout arrêter : `docker compose down` (les données de la base et les fichiers
  déposés sont conservés dans des volumes Docker).

## Sauvegardes
- Base de données : `docker compose exec db pg_dump -U postgres gcf > sauvegarde.sql`
- Fichiers déposés : ils sont dans le volume Docker `uploads_data`.
