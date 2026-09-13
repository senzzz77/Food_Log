# Public Deployment

This deployment runs on one Ubuntu 24.04 cloud server. Docker keeps MySQL and the API private; only Caddy exposes ports 80 and 443. The browser calls the API through the same-origin `/api` path.

## Server Requirements

- Ubuntu 24.04 LTS
- 2 vCPU, 4 GB RAM, 60 GB SSD or better
- A public IPv4 address
- A domain name with an A record pointing to that address
- Firewall security group allowing TCP 22, 80, and 443 only

For a mainland China server, the public domain normally requires an ICP filing. A Hong Kong or Singapore server does not require an ICP filing, but should still use HTTPS.

## Server Setup

```bash
sudo apt update
sudo apt install -y git ca-certificates curl
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
```

Log out and back in, then verify Docker:

```bash
docker --version
docker compose version
```

## Application Setup

```bash
git clone <YOUR_REPOSITORY_URL> diet-assistant
cd diet-assistant
cp deploy/.env.production.example deploy/.env.production
nano deploy/.env.production
```

Set `APP_DOMAIN` to the actual domain and replace every password and `JWT_SECRET`. Do not use `$` in values because Docker Compose treats it as interpolation.

Start the stack:

```bash
docker compose --env-file deploy/.env.production -f docker-compose.production.yml up -d --build
docker compose --env-file deploy/.env.production -f docker-compose.production.yml ps
```

Open `https://<APP_DOMAIN>`. Caddy automatically obtains and renews the TLS certificate once DNS has propagated and ports 80/443 are reachable.

## Operations

```bash
# Application logs
docker compose --env-file deploy/.env.production -f docker-compose.production.yml logs -f api

# Upgrade after pulling new code
git pull
docker compose --env-file deploy/.env.production -f docker-compose.production.yml up -d --build

# Database backup
docker compose --env-file deploy/.env.production -f docker-compose.production.yml exec -T mysql sh -c 'mysqldump -u root -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE"' > diet-assistant-backup.sql
```

Never expose MySQL port 3306 publicly. Keep `deploy/.env.production` only on the server and back up the database regularly.
