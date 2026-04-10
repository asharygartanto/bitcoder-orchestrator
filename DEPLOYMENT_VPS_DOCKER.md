# Production VPS Deployment Guide (Hybrid: Docker + Host PostgreSQL)

This guide provides step-by-step instructions for deploying the Bitcoder AI Orchestrator to a production VPS (Ubuntu/Debian) where the application runs in Docker, but PostgreSQL is installed directly on the host.

## 1. VPS Preparation

### A. Create the 'orchestrator' User
Log in to your VPS as `root` or a user with `sudo` privileges:

```bash
sudo adduser orchestrator
sudo usermod -aG sudo orchestrator
sudo usermod -aG docker orchestrator
```

### B. Configure SSH for 'orchestrator'
Switch to the new user and set up SSH access (Replace `[YOUR_PUBLIC_KEY]` with your local key):

```bash
su - orchestrator
mkdir -p ~/.ssh && chmod 700 ~/.ssh
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

### A. Install Docker and Docker Compose
```bash
sudo apt update && sudo apt upgrade -y
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
```

### B. Install Host PostgreSQL
```bash
sudo apt install postgresql postgresql-contrib -y
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### C. Configure PostgreSQL Networking (CRUCIAL)
Allow Docker containers to connect to the host PostgreSQL.

1.  **Modify `postgresql.conf`**:
    ```bash
    # Replace (XX) with your postgres version (e.g., 14, 15, 16)
    sudo nano /etc/postgresql/$(psql -V | egrep -o '[0-9]{2}')/main/postgresql.conf
    ```
    Set `listen_addresses = 'localhost,172.17.0.1'` (172.17.0.1 is the default Docker gateway).

2.  **Modify `pg_hba.conf`**:
    ```bash
    sudo nano /etc/postgresql/$(psql -V | egrep -o '[0-9]{2}')/main/pg_hba.conf
    ```
    Add this line at the bottom:
    `host all all 172.17.0.0/16 md5`

3.  **Restart PostgreSQL**:
    ```bash
    sudo systemctl restart postgresql
    ```

---

## 3. Application Deployment

Log in as `orchestrator`:

### A. Clone & Setup
```bash
git clone https://github.com/asharygartanto/bitcoder-orchestrator.git
cd bitcoder-orchestrator
```

### B. Database & Environment Configuration
1.  **Initialize Database**:
    Use the provided script to create the DB and user on the host:
    ```bash
    chmod +x setup-db.sh
    ./setup-db.sh
    ```
2.  **Configure `.env`**:
    ```bash
    cp .env.example .env && nano .env
    ```
    Set `DATABASE_URL=postgresql://bitcoder:[PASSWORD]@172.17.0.1:5432/orchestrator?schema=public`

### C. Deploy using the Script
The `deploy.sh` script automates the build and deployment process.
```bash
chmod +x deploy.sh
./deploy.sh
```

---

## 4. Cloudflare DNS & SSL Configuration

### A. Configure Cloudflare DNS
1.  Log in to your **Cloudflare Dashboard**.
2.  Select your domain.
3.  Go to **DNS** -> **Records**.
4.  Add a new **A Record**:
    *   **Type**: `A`
    *   **Name**: `orchestrator` (for `orchestrator.yourdomain.com`)
    *   **IPv4 address**: Your VPS Public IP.
    *   **Proxy status**: `Proxied` (Orange cloud).
5.  Save the record.

### B. Configure SSL/TLS Mode
1.  Go to **SSL/TLS** -> **Overview**.
2.  Select **Full (Strict)**.

### C. Generate Origin Certificate (Optional but Recommended)
Instead of Certbot, use Cloudflare's 15-year Origin Certificate:
1.  Go to **SSL/TLS** -> **Origin Server**.
2.  Click **Create Certificate**.
3.  Keep default settings (ECC, 15 years, includes `*.yourdomain.com` and `yourdomain.com`).
4.  Cloudflare will show the **Origin Certificate** and **Private Key**.
5.  On your VPS, save these to files:
    *   `sudo nano /etc/ssl/certs/cloudflare.pem` (Paste the Certificate)
    *   `sudo nano /etc/ssl/private/cloudflare.key` (Paste the Private Key)

---

## 5. Reverse Proxy Setup (Nginx)

### A. Install Nginx
```bash
sudo apt install nginx -y
```

### B. Configure Nginx for 'orchestrator' Subdomain
Create the configuration: `sudo nano /etc/nginx/sites-available/orchestrator`

```nginx
server {
    listen 80;
    server_name orchestrator.gartanto.site;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name orchestrator.gartanto.site;

    # SSL Configuration (Using Cloudflare Origin Certificate)
    ssl_certificate /etc/ssl/certs/cloudflare.pem;
    ssl_certificate_key /etc/ssl/private/cloudflare.key;

    location / {
        proxy_pass http://localhost:8082; # Frontend
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api/ {
        proxy_pass http://localhost:3002/; # Backend
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### C. Enable Configuration
```bash
sudo ln -s /etc/nginx/sites-available/orchestrator /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## 6. Maintenance Commands

*   **Logs**: `docker compose logs -f`
*   **Prisma Studio**: `docker compose exec backend npx prisma studio --browser none`
*   **Access Host DB**: `psql -h localhost -U bitcoder -d orchestrator`
