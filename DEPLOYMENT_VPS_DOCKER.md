# Production VPS Deployment Guide (Docker)

This guide provides step-by-step instructions for deploying the Bitcoder AI Orchestrator to a production VPS (Ubuntu/Debian) using Docker and a dedicated service user.

## 1. VPS Preparation

### A. Create the 'orchestrator' User
Log in to your VPS as `root` or a user with `sudo` privileges:

```bash
sudo adduser orchestrator
sudo usermod -aG sudo orchestrator
sudo usermod -aG docker orchestrator
```

### B. Configure SSH for 'orchestrator'
Switch to the new user and set up SSH access:

```bash
su - orchestrator
mkdir -p ~/.ssh
chmod 700 ~/.ssh
echo "[YOUR_PUBLIC_KEY]" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

### C. Firewall Setup (UFW)
```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

---

## 2. Infrastructure Installation

Install Docker and Docker Compose:

```bash
sudo apt update && sudo apt upgrade -y
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
```

---

## 3. Application Deployment

Log in as `orchestrator`:

### A. Clone & Setup
```bash
git clone https://github.com/asharygartanto/bitcoder-orchestrator.git
cd bitcoder-orchestrator
```

### B. Configure Environment & Database
The `.env` file defines the database credentials that Docker will use to create the DB and User.

1.  **Copy Environment**: `cp .env.example .env && nano .env`
2.  **Set Database Credentials**:
    *   `POSTGRES_DB`: (e.g., `orchestrator`)
    *   `POSTGRES_USER`: (e.g., `bitcoder`)
    *   `POSTGRES_PASSWORD`: (Your secure password)
    *   `DATABASE_URL`: `postgresql://[USER]:[PASS]@postgres:5432/[DB]?schema=public`

### C. Deploy using the Script
```bash
chmod +x deploy.sh
./deploy.sh
```

### D. Verify & Grant Permissions
After the containers are up, ensure the database user has full schema permissions (Crucial for Prisma):

1.  **Grant Permissions**:
    ```bash
    docker compose exec postgres psql -U root -c "GRANT ALL ON SCHEMA public TO bitcoder;"
    ```
2.  **Verify Connectivity**:
    ```bash
    docker compose exec backend sh -c "nc -zv postgres 5432"
    ```

### E. Manual Database Management
*   **Run Migrations**: `docker compose exec backend npx prisma migrate deploy`
*   **Run Seeding**: `docker compose exec backend npx ts-node prisma/seed.ts`
*   **Access DB CLI**: `docker compose exec postgres psql -U bitcoder -d orchestrator`

---

## 4. Cloudflare DNS Setup

1.  **Add A Record**: Point your subdomain (e.g., `orchestrator`) to your VPS IP.
2.  **Proxy Status**: Enabled (Orange cloud).
3.  **SSL/TLS Mode**: Set to **Full (Strict)**.

---

## 5. Reverse Proxy & SSL (Nginx)

### A. Install Nginx & Certbot
```bash
sudo apt install nginx certbot python3-certbot-nginx -y
```

### B. Configure Nginx
`sudo nano /etc/nginx/sites-available/orchestrator`

```nginx
server {
    listen 80;
    server_name orchestrator.gartanto.site;

    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /api/ {
        proxy_pass http://localhost:3002/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

Enable & SSL:
```bash
sudo ln -s /etc/nginx/sites-available/orchestrator /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl restart nginx
sudo certbot --nginx -d orchestrator.gartanto.site
```

---

## 6. Maintenance Commands

*   **Logs**: `docker compose logs -f`
*   **Prisma Studio**: `docker compose exec backend npx prisma studio --browser none`
