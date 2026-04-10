# Deployment & Local Testing Guide (Non-Docker)

This guide provides detailed instructions for setting up, testing, and deploying the Bitcoder AI Orchestrator application in a non-Docker environment.

## 1. Prerequisites

Ensure the following are installed on your system:

### Development Environment

1. **Node.js**: Version 20 or higher.
   *   **Ubuntu/Debian**:
       ```bash
       curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
       sudo apt-get install -y nodejs
       ```
   *   **Windows**: Download installer from [nodejs.org](https://nodejs.org/).

2. **Python**: Version 3.10 or higher.
   *   **Ubuntu/Debian**:
       ```bash
       sudo apt update
       sudo apt install python3 python3-venv python3-pip -y
       ```

3. **PostgreSQL**: Version 14 or higher.
   *   **Ubuntu/Debian**:
       ```bash
       sudo apt install postgresql postgresql-contrib -y
       # Create database and user
       sudo -u postgres psql -c "CREATE DATABASE bitcoder;"
       sudo -u postgres psql -c "CREATE USER bitcoder WITH PASSWORD 'bitcoder_password';"
       sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE bitcoder TO bitcoder;"
       ```

4. **PM2**: Process manager (for production).
   ```bash
   sudo npm install -g pm2
   ```

### External Services
*   **ChromaDB**: Required for document searching.
    *   **Installation**:
        ```bash
        # Recommended to use a virtual environment
        python3 -m venv chroma_env
        source chroma_env/bin/activate
        pip install chromadb
        ```
    *   **Running**:
        ```bash
        chroma run --path ./chroma_data --port 8001
        ```

---

## 2. Environment Setup

1.  **Clone the repository** (if not already done).
2.  **Configure Environment Variables**:
    *   Copy `.env.example` to a new file named `.env` in the root directory.
    *   Update the following values in `.env`:
        *   `DATABASE_URL`: Set your PostgreSQL connection string (e.g., `postgresql://user:password@localhost:5432/bitcoder_db`).
        *   `JWT_SECRET`: Generate a long random string.
        *   `AI_API_KEY`: Your Bitcoder AI API Key.
        *   `NODE_ENV`: Set to `development` for local testing or `production` for server deployment.

3.  **Database Setup**:
    *   Create a new database in PostgreSQL matching the name in your `DATABASE_URL`.
    *   Ensure the user has appropriate permissions.

---

## 3. Local Development & Testing

Follow these steps to run each service locally.

### A. Backend (NestJS)
1.  Navigate to the backend directory: `cd backend`
2.  Install dependencies: `npm install`
3.  Generate Prisma client: `npx prisma generate`
4.  Run migrations (if testing): `npx prisma migrate dev`
5.  Seed the database: `npm run prisma:seed`
6.  Start in development mode: `npm run start:dev`
    *   API will be available at `http://localhost:3002`
    *   Swagger docs at `http://localhost:3002/api/docs`

### B. RAG Engine (Python/FastAPI)
1.  Navigate to the rag-engine directory: `cd rag-engine`
2.  Create a virtual environment: `python -m venv venv`
3.  Activate the virtual environment:
    *   Windows: `venv\Scripts\activate`
    *   Linux/macOS: `source venv/bin/activate`
4.  Install dependencies: `pip install -r requirements.txt`
5.  Start the RAG Engine:
    ```bash
    uvicorn main:app --host 0.0.0.0 --port 8000 --reload
    ```
    *   Service will be available at `http://localhost:8000`

### C. Frontend (React/Vite)
1.  Navigate to the frontend directory: `cd frontend`
2.  Install dependencies: `npm install`
3.  Start the development server: `npm run dev`
    *   Frontend will be available at `http://localhost:5173` (or the port shown in terminal).

---

## 4. Production Server Deployment

For deploying to a production server (Ubuntu/Debian recommended) without Docker.

### Step 1: Build the Components
1.  **Backend**:
    ```bash
    cd backend
    npm install
    npm run build
    npx prisma migrate deploy
    ```
2.  **Frontend**:
    ```bash
    cd frontend
    npm install
    npm run build
    ```
    *   This generates a `dist` folder. You will use Nginx to serve these static files.

### Step 2: Manage Processes with PM2
Use PM2 to keep the backend and RAG engine running in the background.

1.  **Start Backend**:
    ```bash
    cd backend
    pm2 start dist/main.js --name "bitcoder-backend"
    ```
2.  **Start RAG Engine**:
    ```bash
    cd rag-engine
    pm2 start "uvicorn main:app --host 127.0.0.1 --port 8000" --name "bitcoder-rag"
    ```
3.  **Start ChromaDB**:
    ```bash
    pm2 start "chroma run --path ./chroma_data --port 8001" --name "bitcoder-chroma"
    ```

### Step 3: Configure Nginx
Use Nginx as a reverse proxy. Create a configuration file (e.g., `/etc/nginx/sites-available/bitcoder`).

Example configuration:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Frontend Static Files
    location / {
        root /path/to/bitcoder/frontend/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # Backend API Proxy
    location /api/ {
        proxy_pass http://localhost:3002/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # RAG Engine Proxy (if needed publicly)
    location /rag/ {
        proxy_pass http://localhost:8000/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }
}
```
Enable the site: `sudo ln -s /etc/nginx/sites-available/bitcoder /etc/nginx/sites-enabled/` and restart nginx: `sudo systemctl restart nginx`.

## 5. Testing & Verification

After all services are running, verify the connectivity.

### A. Test ChromaDB Connection
Ensure the vector store is responding:
```bash
curl http://localhost:8001/api/v1/heartbeat
# Expected: {"nanosecond_heartbeat": ...}
```

### B. Test Backend API
Check if the API is alive:
```bash
curl http://localhost:3002/api/health
```

### C. Test RAG Engine Connection
Verify the FastAPI service:
```bash
curl http://localhost:8000/
# Expected: {"message": "Bitcoder AI RAG Engine API is running"}
```

### D. Python Client Test (Optional)
Run this small script to verify the ChromaDB python client:
```python
import chromadb
client = chromadb.HttpClient(host='localhost', port=8001)
print(f"Connected to ChromaDB! Heartbeat: {client.heartbeat()}")
```

---

## 6. Troubleshooting

*   **Database Connection Error**: Verify `DATABASE_URL` in `.env` and ensure PostgreSQL is running.
*   **Prisma Errors**: Run `npx prisma generate` after any changes to `prisma/schema.prisma`.
*   **CORS Issues**: Ensure `FRONTEND_URL` and `BACKEND_URL` are correctly set in `.env`.
*   **Python Dependencies**: Ensure you are using the virtual environment when installing and running the rag-engine.
*   **Port Conflicts**: Check if ports 3002, 8000, 8001, or 5173 are already in use.
