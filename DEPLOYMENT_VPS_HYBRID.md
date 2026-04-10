# Hybrid VPS Deployment Guide (Docker App + Host PostgreSQL)

This guide is for a **Hybrid Setup** where:
*   **PostgreSQL** is installed directly on the VPS host.
*   **The Application** (Backend, Frontend, RAG Engine) runs inside Docker containers.

## 1. Host PostgreSQL Setup

### A. Installation
Log in to your VPS as `root` or a sudo user:
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib -y
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### C. Configure PostgreSQL Networking (CRUCIAL)
By default, PostgreSQL only listens on `localhost`. You must allow it to listen on the Docker bridge IP so the containers can connect.

1.  **Modify `postgresql.conf`**:
    ```bash
    sudo nano /etc/postgresql/$(psql -V | egrep -o '[0-9]{2}')/main/postgresql.conf
    ```
    Find `#listen_addresses = 'localhost'` and change it to:
    ```conf
    listen_addresses = 'localhost,172.17.0.1'
    ```
    *(172.17.0.1 is the default Docker gateway IP)*.

2.  **Modify `pg_hba.conf`**:
    ```bash
    sudo nano /etc/postgresql/$(psql -V | egrep -o '[0-9]{2}')/main/pg_hba.conf
    ```
    Add this line at the bottom to allow the Docker network:
    ```conf
    # Allow Docker containers to connect
    host    all             all             172.17.0.0/16           md5
    ```

3.  **Restart PostgreSQL**:
    ```bash
    sudo systemctl restart postgresql
    ```

---

## 2. Application Deployment (Docker)

Log in as the `orchestrator` user.

### A. Project Setup
```bash
git clone https://github.com/asharygartanto/bitcoder-orchestrator.git
cd bitcoder-orchestrator
```

### B. Configure Environment
Prepare your `.env` file:
```bash
cp .env.example .env
nano .env
```

Set these values specifically for the hybrid setup:
*   **DATABASE_URL**: Use the Docker Gateway IP (`172.17.0.1`) instead of `postgres`.
    *   Example: `DATABASE_URL=postgresql://bitcoder:password@172.17.0.1:5432/orchestrator?schema=public`

### C. Run the Hybrid Stack
Instead of using the standard `deploy.sh` (which uses the regular `docker-compose.yml`), use the hybrid version:

```bash
# Pull and Build
docker compose -f docker-compose.hybrid.yml build

# Start services
docker compose -f docker-compose.hybrid.yml up -d

# Run Migrations (on the host database from the backend container)
docker compose -f docker-compose.hybrid.yml exec backend npx prisma migrate deploy
```

---

## 3. Verification

### A. Test Connectivity from Container to Host
Verify the backend container can reach the host-installed PostgreSQL:
```bash
docker compose -f docker-compose.hybrid.yml exec backend sh -c "nc -zv 172.17.0.1 5432"
```

### B. Test API Health
```bash
curl http://localhost:3002/api/health
```

---

## 4. Maintenance

*   **View Logs**: `docker compose -f docker-compose.hybrid.yml logs -f`
*   **Restart stack**: `docker compose -f docker-compose.hybrid.yml restart`
*   **Stop stack**: `docker compose -f docker-compose.hybrid.yml down`
