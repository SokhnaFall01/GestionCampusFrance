# Déploiement sur votre VPS (Docker, plusieurs apps possibles)

Architecture : **un proxy Caddy partagé** gère le HTTPS (certificats automatiques)
et aiguille chaque **sous-domaine** vers la bonne application. Chaque application
tourne dans ses propres conteneurs. On peut ainsi héberger **plusieurs apps** sur
le même serveur / la même IP.

```
Internet ──▶ Caddy (ports 80/443, HTTPS auto)
                 ├─ campus.tondomaine.com   ▶ campus_app:3000   (cette app + sa base)
                 └─ autreapp.tondomaine.com ▶ autre_app:3000    (votre autre app)
```

## Ce qu'il vous faut
- Un VPS (Ubuntu/Debian) avec accès **SSH**.
- Un **nom de domaine**, avec un enregistrement **A** par sous-domaine, pointant
  vers l'**IP** du VPS (ex : `campus.tondomaine.com` → IP).
- Ports **80** et **443** ouverts.

---

## 1. DNS
Créez un enregistrement **A** : `campus.tondomaine.com` → `IP_DE_VOTRE_VPS`.
(Et un autre pour votre seconde app, ex : `autreapp.tondomaine.com` → même IP.)

## 2. SSH + Docker (une seule fois)
```bash
ssh root@IP_DE_VOTRE_VPS
curl -fsSL https://get.docker.com | sh
```

## 3. Créer le réseau partagé (une seule fois)
```bash
docker network create web
```

## 4. Démarrer le proxy Caddy partagé (une seule fois)
```bash
git clone https://github.com/SokhnaFall01/GestionCampusFrance.git
cd GestionCampusFrance
git checkout claude/trusting-bohr-viapce

# Renseigner vos domaines dans le Caddyfile du proxy :
nano deploy/proxy/Caddyfile      # remplacez campus.tondomaine.com
cd deploy/proxy
docker compose up -d
cd ../..
```

## 5. Configurer et lancer l'application Campus France
```bash
cp .env.docker.example .env
nano .env       # DOMAIN, POSTGRES_PASSWORD, ADMIN_PASSWORD (AUTH_SECRET déjà rempli)
docker compose up -d --build
```
Au premier démarrage, l'app crée les tables, votre compte admin et les
étapes/documents par défaut.

## 6. Ouvrir le site
**https://campus.tondomaine.com** → connectez-vous avec votre email et
`ADMIN_PASSWORD`. 🎉

---

## Ajouter votre DEUXIÈME application
1. DNS : `autreapp.tondomaine.com` → même IP.
2. Lancez votre autre app en Docker en la **reliant au réseau partagé `web`**
   (dans son `docker-compose.yml` : ajoutez le réseau externe `web` au service
   web, et donnez-lui un `container_name`, ex : `autre_app`). Ne publiez PAS ses
   ports 80/443 (c'est Caddy qui s'en charge).
3. Ajoutez son bloc dans `deploy/proxy/Caddyfile` :
   ```
   autreapp.tondomaine.com {
       encode gzip
       reverse_proxy autre_app:3000
   }
   ```
4. Rechargez le proxy :
   ```bash
   cd deploy/proxy && docker compose restart && cd ../..
   ```

> ⚠️ Une seule application doit occuper les ports 80/443 : c'est **le proxy
> Caddy partagé**. Les autres apps ne publient pas ces ports, elles sont
> jointes au réseau `web` et référencées par leur nom de conteneur.

---

## Commandes utiles
- Journaux de l'app : `docker compose logs -f app`
- Journaux du proxy : `cd deploy/proxy && docker compose logs -f`
- Mettre à jour l'app après un changement de code :
  ```bash
  git pull && docker compose up -d --build
  ```
- Arrêter l'app : `docker compose down` (données et fichiers conservés dans les volumes).

## Sauvegardes
- Base de données : `docker compose exec db pg_dump -U postgres gcf > sauvegarde.sql`
- Fichiers déposés : volume Docker `uploads_data`.
