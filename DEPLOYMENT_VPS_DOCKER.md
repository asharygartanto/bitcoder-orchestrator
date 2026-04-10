# Production VPS Deployment Guide (Docker)

This guide provides step-by-step instructions for deploying the Bitcoder AI Orchestrator to a production VPS (Ubuntu/Debian) using Docker and a dedicated service user.

## 1. VPS Preparation

### A. Create the 'orchestrator' User
Log in to your VPS as `root` or a user with `sudo` privileges and run the following:

```bash
# Create the user
sudo adduser orchestrator

# Add to sudo group
sudo usermod -aG sudo orchestrator

# Add to docker group (we will install docker next)
sudo usermod -aG docker orchestrator
```

### B. Configure SSH for 'orchestrator'
Switch to the new user and set up SSH access:

```bash
# Switch to orchestrator user
su - orchestrator

# Create .ssh directory
mkdir -p ~/.ssh
chmod 700 ~/.ssh

# Add your public key to authorized_keys
# (Replace [YOUR_PUBLIC_KEY] with the content of your local ~/.ssh/id_rsa.pub)
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

Install Docker and Docker Compose on the VPS:

```bash
# Update packages
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Verify installation
docker --version
docker compose version
```

---

## 3. Application Deployment

Log in as the `orchestrator` user to perform these steps.

### A. Clone the Repository
```bash
cd /home/orchestrator
git clone https://github.com/your-username/bitcoder-orchestrator.git
cd bitcoder-orchestrator
```

### B. Configure Environment
```bash
cp .env.example .env
nano .env
```
Ensure you set:
*   `NODE_ENV=production`
*   `DATABASE_URL` (The docker-compose uses a internal network, so use `postgresql://bitcoder:password@postgres:5432/bitcoder`)
*   `JWT_SECRET`
*   `AI_API_KEY`
*   Any domain-specific variables.

### C. Deploy using the Script
The project includes a `deploy.sh` script that automates the building and starting of containers.

```bash
# Make the script executable
chmod +x deploy.sh

# Run the deployment
./deploy.sh
```

This script will:
1. Pull the latest code.
2. Build Docker images.
3. Start containers in detached mode.
4. Run Prisma migrations.
5. Seed the initial data.

### D. Verify Service Connectivity (Internal)
Since the services run within a Docker network, you can test if they can talk to each other:

1.  **Test Backend -> Postgres**:
    ```bash
    docker compose exec backend sh -c "nc -zv postgres 5432"
    ```
2.  **Test RAG-Engine -> ChromaDB**:
    ```bash
    docker compose exec rag-engine sh -c "curl http://chromadb:8000/api/v1/heartbeat"
    ```

---

## 4. Cloudflare DNS Setup

Before configuring Nginx, ensure your subdomain is pointing to your VPS IP address in Cloudflare.

### Step 1: Add DNS Record
1.  Log in to your **Cloudflare Dashboard**.
2.  Select your **Domain**.
3.  Go to **DNS** -> **Records**.
4.  Click **Add Record**:
    *   **Type**: `A`
    *   **Name**: `orchestrator` (for `orchestrator.yourdomain.com`) or `@` (for root).
    *   **IPv4 address**: Your VPS Public IP.
    *   **Proxy status**: `Proxied` (Orange cloud) for better security and CDN features.
5.  Click **Save**.

### Step 2: Configure SSL/TLS Mode
1.  Go to **SSL/TLS** -> **Overview**.
2.  Select **Full** or **Full (Strict)** mode. 
    *   **Full**: Traffic between Cloudflare and your VPS is encrypted, but the certificate on the VPS is not verified (recommended if using self-signed or initial Certbot).
    *   **Full (Strict)**: Requires a valid certificate on your VPS (recommended after Certbot setup).

---

## 5. Reverse Proxy & SSL (Nginx)

The Docker setup maps the frontend to port `8080`, backend to `3002`, and RAG-engine to `8000`. You should use Nginx on the host to handle HTTPS.

### A. Install Nginx and Certbot
```bash
sudo apt install nginx certbot python3-certbot-nginx -y
```

### B. Configure Nginx
Create a configuration: `sudo nano /etc/nginx/sites-available/orchestrator`

```nginx
server {
    listen 80;
    server_name orchestrator.gartanto.site; # Replace with your domain

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

Enable the config and get SSL:
```bash
sudo ln -s /etc/nginx/sites-available/orchestrator /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# Get SSL certificate
sudo certbot --nginx -d orchestrator.gartanto.site

### C. Verify External Connectivity
Test the services through the public domain:

1.  **Backend Health**: `curl https://orchestrator.gartanto.site/api/health`
2.  **RAG Engine Health**: `curl https://orchestrator.gartanto.site/rag/` (Note: Ensure `/rag/` is mapped in Nginx if you want to test this).

---

## 6. Maintenance Commands

As the `orchestrator` user:

*   **View Logs**: `docker compose logs -f`
*   **Restart All**: `./deploy.sh`
*   **Stop All**: `docker compose down`
*   **Check Stats**: `docker stats`
*   **Prisma Studio (Port 5555)**: `docker compose exec backend npx prisma studio`
