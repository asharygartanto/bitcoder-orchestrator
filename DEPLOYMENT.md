# Bitcoder AI Orchestrator — Deployment Guide

## Arsitektur

```
ORCHESTRATOR CLOUD                          CLIENT SERVER (On-Premise)
┌──────────────────────────┐                ┌──────────────────────────┐
│  Nginx (SSL, reverse)    │                │  Docker Compose          │
│  ├── :443 → Frontend     │                │  ├── PostgreSQL (data)   │
│  ├── :443 → Backend      │                │  ├── ChromaDB (vectors)  │
│  └── :443 → WS /agent    │◄── WSS ───────│  ├── RAG Engine (Python) │
│                          │   (outbound)   │  └── Agent (Node.js)     │
│  Frontend (React/Vite)   │                │      └── health monitor  │
│  Backend (NestJS)        │                │      └── task executor   │
│  ├── Auth / JWT          │                │      └── config receiver │
│  ├── Client Management   │                └──────────────────────────┘
│  ├── Agent Gateway (WS)  │
│  └── RAG Proxy → Agent   │
│  PostgreSQL (users/meta) │
└──────────────────────────┘
```

**Prinsip:** Client server TIDAK membuka port inbound. Agent melakukan outbound WebSocket ke cloud.

---

## Role Hierarchy

```
SUPER_ADMIN (Bitcoder)
├── Mengelola semua client
├── Membuat organisasi PT Client
├── Mengkonfigurasi DB, AI, Storage per client
├── Generate Agent Key
├── Melihat status semua client
└── Bisa asemulasikan peran admin client

ADMIN (PT Client)
├── Melihat status client miliknya
├── Mengkonfigurasi DB, AI, Storage org-nya
├── Membuat sub-organisasi (divisi)
├── Menambah user ke organisasi/sub-org
└── Menggunakan Chat & Knowledge Context

USER
├── Menggunakan Chat
└── Tidak bisa akses admin
```

---

## Alur Setup Client

```
1. SUPER_ADMIN login ke orchestrator.gartanto.site
2. Buka menu Clients → klik "Add"
3. Isi nama PT → dapat Agent Key + Install Command
4. Kirim install command ke admin IT di PT Client
5. Admin IT jalankan command di server mereka:
   curl -sSL https://orchestrator.gartanto.site/api/agent/install.sh | bash -s -- --key=bc_ag_xxxxx
6. Script auto-install Docker + semua service
7. Agent connect ke cloud via WebSocket
8. Dashboard menampilkan status 🟢 ONLINE
9. SUPER_ADMIN edit config (DB, AI, Storage) di orchestrator
10. Config otomatis di-push ke agent via WebSocket
```

---

## Deployment Cloud (Orchestrator)

### Prasyarat Server Cloud

- Ubuntu 22.04+ / Debian 12+
- Minimum 2 vCPU, 4GB RAM, 40GB SSD
- Docker + Docker Compose
- Domain pointing ke IP server

### Langkah-langkah

#### 1. Setup Server

```bash
# Login ke server
ssh root@your-server-ip

# Update system
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sh

# Create user
useradd -m -s /bin/bash orchestrator
usermod -aG docker orchestrator

# Switch to user
su - orchestrator
```

#### 2. Clone dan Setup

```bash
cd /home/orchestrator
git clone <repo-url> bitcoder-orchestrator
cd bitcoder-orchestrator

# Copy dan edit environment
cp .env.example .env
nano .env
```

**Penting di `.env` production:**

```env
NODE_ENV=production
APP_DOMAIN=orchestrator.gartanto.site
APP_URL=https://orchestrator.gartanto.site
FRONTEND_URL=https://orchestrator.gartanto.site

# Ganti password DB
POSTGRES_PASSWORD=<strong-password>

# Ganti JWT secret (minimal 64 karakter random)
JWT_SECRET=<generate-with-openssl-rand-hex-32>

# AI API
AI_API_KEY=<your-bitcoder-api-key>

# Google OAuth (jika pakai)
GOOGLE_CLIENT_ID=<your-client-id>
GOOGLE_CLIENT_SECRET=<your-client-secret>
```

#### 3. Build dan Jalankan

```bash
# Build semua container
docker compose build

# Jalankan
docker compose up -d

# Cek status
docker compose ps

# Jalankan migrasi database
docker compose exec -T backend npx prisma migrate deploy

# Seed admin user
docker compose exec -T backend npx ts-node prisma/seed.ts
```

#### 4. Setup Nginx + SSL

```bash
# Install nginx dan certbot
sudo apt install nginx certbot python3-certbot-nginx -y

# Copy konfigurasi nginx
sudo cp nginx/orchestrator.gartanto.site.conf /etc/nginx/sites-available/
sudo ln -s /etc/nginx/sites-available/orchestrator.gartanto.site.conf /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test konfigurasi
sudo nginx -t

# Dapatkan SSL certificate
sudo certbot --nginx -d orchestrator.gartanto.site

# Restart nginx
sudo systemctl restart nginx
```

#### 5. Verifikasi

```bash
# Cek semua container running
docker compose ps

# Cek backend health
curl http://localhost:3002/api

# Cek frontend
curl -I http://localhost:8080

# Cek dari browser
# https://orchestrator.gartanto.site
```

---

## Testing Lokal (Tanpa Docker)

Untuk development dan testing, jalankan service secara individual:

### 1. Database saja pakai Docker

```bash
# Jalankan hanya PostgreSQL dan ChromaDB
docker compose -f docker-compose.dev.yml up -d
```

### 2. Backend (NestJS)

```bash
cd backend

# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Jalankan migrasi
npx prisma migrate dev

# Seed admin
npx ts-node prisma/seed.ts

# Jalankan dev server (watch mode)
npm run start:dev
# Backend berjalan di http://localhost:3002
# Swagger: http://localhost:3002/api/docs
```

### 3. RAG Engine (Python/FastAPI)

```bash
cd rag-engine

# Buat virtual environment
python -m venv venv
source venv/bin/activate   # Linux/Mac
# venv\Scripts\activate    # Windows

# Install dependencies
pip install -r requirements.txt

# Jalankan
uvicorn main:app --reload --port 8000
# RAG Engine di http://localhost:8000
# Swagger: http://localhost:8000/docs
```

### 4. Test API (Cuti Mock)

```bash
cd rag-engine/test_api

# Jalankan
python cuti_api.py
# Test API di http://localhost:8090

# Test endpoints
curl http://localhost:8090/api/leave/balance?emp_id=EMP001
curl http://localhost:8090/api/employees
curl http://localhost:8090/api/leave/history?emp_id=EMP001
curl -X POST http://localhost:8090/api/leave/submit \
  -H "Content-Type: application/json" \
  -d '{"emp_id":"EMP001","leave_type":"Annual","start_date":"2025-04-20","end_date":"2025-04-22","reason":"Vacation"}'
```

### 5. Frontend (React/Vite)

```bash
cd frontend

# Install dependencies
npm install

# Jalankan dev server
npm run dev
# Frontend di http://localhost:5173
# Proxy /api otomatis ke localhost:3002
```

### 6. Environment Lokal

Pastikan `.env` di root project sudah dikonfigurasi:

```env
NODE_ENV=development
DATABASE_URL=postgresql://bitcoder:bitcoder_dev_password@localhost:5432/bitcoder?schema=public
RAG_ENGINE_URL=http://localhost:8000
BACKEND_URL=http://localhost:3002
VITE_API_URL=http://localhost:3002
VITE_RAG_ENGINE_URL=http://localhost:8000
```

---

## Deployment Client (On-Premise)

### Prasyarat Server Client

- Ubuntu 22.04+ / Debian 12+
- Minimum 4 vCPU, 8GB RAM, 100GB SSD
- Akses internet (outbound only, port 443)
- Docker akan diinstall otomatis

### Setup via Install Script (Rekomendasi)

Admin IT di client cukup menjalankan **satu command** yang diberikan oleh SUPER_ADMIN:

```bash
curl -sSL https://orchestrator.gartanto.site/api/agent/install.sh | bash -s -- --key=bc_ag_xxxxxxxxxxxx
```

Script ini secara otomatis:
1. Install Docker jika belum ada
2. Install Docker Compose jika belum ada
3. Download docker-compose.yml dari cloud
4. Buat file .env dengan konfigurasi
5. Pull images dan start semua service
6. Agent auto-connect ke cloud

### Setup Manual (Jika Diperlukan)

```bash
# 1. Install Docker
curl -fsSL https://get.docker.com | sh

# 2. Buat direktori
mkdir -p /opt/bitcoder-agent && cd /opt/bitcoder-agent

# 3. Buat .env
cat > .env << EOF
AGENT_KEY=bc_ag_xxxxxxxxxxxx
CLOUD_URL=https://orchestrator.gartanto.site
POSTGRES_DB=bitcoder
POSTGRES_USER=bitcoder
POSTGRES_PASSWORD=$(openssl rand -hex 16)
EOF

# 4. Download compose file
curl -sSL https://orchestrator.gartanto.site/api/agent/compose -o docker-compose.yml

# 5. Start
docker compose up -d

# 6. Cek status
docker compose ps
docker compose logs -f agent
```

---

## Konfigurasi Client dari Orchestrator

Semua konfigurasi dikelola dari web orchestrator. Tidak perlu login ke server client.

### Tab Database

| Field | Default | Keterangan |
|-------|---------|------------|
| Host | `postgres` | Hostname di Docker network |
| Port | `5432` | PostgreSQL port |
| Database Name | `bitcoder_<slug>` | Nama database |
| User | `bitcoder` | DB user |
| Password | *(auto-generate)* | DB password |

### Tab AI

| Field | Default | Keterangan |
|-------|---------|------------|
| API Key | *(kosong)* | Bitcoder AI API key |
| Base URL | `https://api.bitcoder.ai/v1` | AI API endpoint |
| Chat Model | `bitcoder-chat` | Model untuk chat |
| Embedding Model | `bitcoder-embedding` | Model untuk embedding |
| Max Tokens | `4096` | Maksimal token response |
| Temperature | `0.7` | Kreativitas jawaban |

### Tab Storage

| Field | Default | Keterangan |
|-------|---------|------------|
| Upload Directory | `./uploads` | Lokasi penyimpanan dokumen |
| Max File Size | `52428800` (50MB) | Batas ukuran file upload |

Setelah edit config, klik **"Save & Push to Agent"**. Config akan otomatis ter-push ke client via WebSocket.

---

## Monitoring

### Dashboard Clients

Buka **https://orchestrator.gartanto.site/clients** untuk melihat:

- **Status koneksi** (Online/Offline/Setting Up)
- **Service health** (PostgreSQL, ChromaDB, RAG Engine)
- **Resource usage** (Disk, Memory)
- **Last seen** timestamp

### Status Indicators

| Icon | Status | Keterangan |
|------|--------|------------|
| 🟢 | ONLINE | Agent terhubung, semua service OK |
| 🟡 | SETTING_UP | Agent baru connect, sedang setup |
| 🔴 | OFFLINE | Agent tidak terhubung |

### Useful Commands di Server Client

```bash
# Lihat log agent
cd /opt/bitcoder-agent && docker compose logs -f agent

# Lihat log semua service
cd /opt/bitcoder-agent && docker compose logs -f

# Restart semua service
cd /opt/bitcoder-agent && docker compose restart

# Restart hanya agent
cd /opt/bitcoder-agent && docker compose restart agent

# Cek status container
cd /opt/bitcoder-agent && docker compose ps

# Stop semua
cd /opt/bitcoder-agent && docker compose down

# Update ke versi terbaru
cd /opt/bitcoder-agent && docker compose pull && docker compose up -d
```

---

## Troubleshooting

### Agent tidak connect

```bash
# Cek log agent
docker compose logs agent

# Cek koneksi ke cloud
curl -sSL https://orchestrator.gartanto.site/api/health

# Cek AGENT_KEY di .env
cat .env | grep AGENT_KEY

# Restart agent
docker compose restart agent
```

### PostgreSQL tidak mau nyala

```bash
# Cek log
docker compose logs postgres

# Cek disk space
df -h

# Reset data (HATI-HATI: hapus semua data)
docker compose down -v
docker compose up -d
```

### RAG Engine error

```bash
# Cek log
docker compose logs rag-engine

# Cek koneksi ke PostgreSQL
docker compose exec rag-engine python -c "import psycopg2; psycopg2.connect('postgresql://bitcoder:password@postgres:5432/bitcoder')"

# Cek koneksi ke ChromaDB
docker compose exec rag-engine python -c "import httpx; print(httpx.get('http://chromadb:8000/api/v1/heartbeat').status_code)"
```

### WebSocket connection gagal

```bash
# Di server cloud, cek WebSocket endpoint
# Dari browser console:
# new WebSocket('wss://orchestrator.gartanto.site/api/agent')

# Cek Nginx config untuk WebSocket upgrade
# Pastikan ada:
# proxy_set_header Upgrade $http_upgrade;
# proxy_set_header Connection "upgrade";
```

### Build frontend error

```bash
# Typecheck
cd frontend && npx tsc --noEmit

# Build
cd frontend && npm run build
```

---

## Manajemen User

### SUPER_ADMIN membuat Admin PT Client

1. SUPER_ADMIN buat Client di menu Clients → dapat org + agent key
2. Buat user admin untuk org tersebut:
   ```
   POST /api/organizations/{orgId}/users
   {
     "email": "admin@ptmaju.co.id",
     "name": "Admin PT Maju",
     "password": "SecurePass123!",
     "role": "ADMIN"
   }
   ```
3. Admin PT Client login dan bisa manage org-nya sendiri

### Admin PT Client membuat sub-organisasi

```
POST /api/organizations
{
  "name": "Divisi Engineering",
  "parentId": "<id-org-pt-client>"
}
```

### Admin PT Client menambah user

```
POST /api/organizations/{orgId}/users
{
  "email": "ahmad@ptmaju.co.id",
  "name": "Ahmad Rizki",
  "password": "UserPass123!",
  "role": "USER"
}
```

---

## Update / Redeploy Cloud

```bash
cd /home/orchestrator/bitcoder-orchestrator

# Pull latest code
git pull origin main

# Rebuild dan restart
docker compose build --no-cache
docker compose down
docker compose up -d

# Run migrations
docker compose exec -T backend npx prisma migrate deploy

# Cek
docker compose ps
docker compose logs -f backend
```

---

## Backup

### Cloud (User/Auth metadata)

```bash
docker compose exec -T postgres pg_dump -U bitcoder bitcoder > backup_cloud_$(date +%Y%m%d).sql
```

### Client (Semua data)

```bash
# Di server client
cd /opt/bitcoder-agent

# Backup PostgreSQL
docker compose exec -T postgres pg_dump -U bitcoder bitcoder > backup_$(date +%Y%m%d).sql

# Backup ChromaDB
docker compose exec chromadb tar czf - /chroma/chroma > chroma_backup_$(date +%Y%m%d).tar.gz

# Backup uploads
tar czf uploads_backup_$(date +%Y%m%d).tar.gz uploads/
```
