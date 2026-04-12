import { Controller, Get, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { ClientService } from '../client/client.service';

@Controller('agent')
export class AgentInstallController {
  constructor(private clientService: ClientService) {}

  @Get('install.sh')
  async getInstallScript(@Res() res: Response) {
    const script = `#!/bin/bash
set -e
AGENT_KEY=""
LICENSE_KEY=""
CLOUD_URL=""
INSTALL_DIR="/opt/bitcoder-agent"
for arg in "$@"; do
  case $arg in
    --key=*) AGENT_KEY="\${arg#*=}" ;;
    --license=*) LICENSE_KEY="\${arg#*=}" ;;
    --cloud=*) CLOUD_URL="\${arg#*=}" ;;
    --dir=*) INSTALL_DIR="\${arg#*=}" ;;
  esac
done
if [ -z "$AGENT_KEY" ]; then
  echo "ERROR: --key is required"
  exit 1
fi
if [ -z "$LICENSE_KEY" ]; then
  echo "ERROR: --license is required. Contact your administrator for a license key."
  exit 1
fi
if [ -z "$CLOUD_URL" ]; then
  CLOUD_URL="${process.env.APP_URL || 'https://orchestrator.gartanto.site'}"
fi
echo "========================================"
echo "  Bitcoder Agent Installer"
echo "========================================"
echo ""
echo "[1/7] Checking prerequisites..."
if [[ "$(uname)" != "Linux" ]]; then
  echo "ERROR: This script only supports Linux."
  exit 1
fi
if ! command -v docker &> /dev/null; then
  echo "[2/7] Installing Docker..."
  curl -fsSL https://get.docker.com | sh
  systemctl start docker
  systemctl enable docker
else
  echo "[2/7] Docker already installed."
fi
if ! docker compose version &> /dev/null; then
  echo "       Installing Docker Compose plugin..."
  apt-get update -qq && apt-get install -y -qq docker-compose-plugin 2>/dev/null || {
    mkdir -p /usr/local/lib/docker/cli-plugins
    curl -SL "https://github.com/docker/compose/releases/latest/download/docker-compose-linux-$(uname -m)" -o /usr/local/lib/docker/cli-plugins/docker-compose
    chmod +x /usr/local/lib/docker/cli-plugins/docker-compose
  }
else
  echo "       Docker Compose already available."
fi
echo "[3/7] Setting up directory: $INSTALL_DIR"
mkdir -p "$INSTALL_DIR"
echo "[4/7] Downloading docker-compose.yml..."
curl -sSL "$CLOUD_URL/api/agent/compose" -o "$INSTALL_DIR/docker-compose.yml"
echo "[5/7] Creating environment file..."
POSTGRES_PASSWORD=$(openssl rand -hex 16 2>/dev/null || head -c 32 /dev/urandom | xxd -p)
cat > "$INSTALL_DIR/.env" << ENVEOF
AGENT_KEY=$AGENT_KEY
CLOUD_URL=$CLOUD_URL
POSTGRES_DB=bitcoder
POSTGRES_USER=bitcoder
POSTGRES_PASSWORD=$POSTGRES_PASSWORD
ENVEOF
echo "[6/7] Starting services..."
cd "$INSTALL_DIR"
docker compose pull 2>/dev/null || true
docker compose up -d
echo "[7/7] Verifying services..."
sleep 5
echo ""
echo "========================================"
echo "  Installation Complete!"
echo "========================================"
echo ""
echo "  Directory:  $INSTALL_DIR"
echo "  Agent Key:  \${AGENT_KEY:0:12}..."
echo "  Cloud:      $CLOUD_URL"
echo ""
echo "  Agent is connecting to cloud..."
echo "  Check status at: $CLOUD_URL/clients"
echo ""
echo "Useful commands:"
echo "  Logs:    cd $INSTALL_DIR && docker compose logs -f agent"
echo "  Status:  cd $INSTALL_DIR && docker compose ps"
echo "  Restart: cd $INSTALL_DIR && docker compose restart"
echo "  Stop:    cd $INSTALL_DIR && docker compose down"
`;

    res.setHeader('Content-Type', 'text/x-shellscript');
    res.send(script);
  }

  @Get('compose')
  async getComposeFile(@Res() res: Response) {
    const compose = `version: "3.9"
services:
  postgres:
    image: postgres:16-alpine
    container_name: bitcoder-client-postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: \${POSTGRES_DB:-bitcoder}
      POSTGRES_USER: \${POSTGRES_USER:-bitcoder}
      POSTGRES_PASSWORD: \${POSTGRES_PASSWORD:-bitcoder}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U \${POSTGRES_USER:-bitcoder}"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - bitcoder-net

  chromadb:
    image: chromadb/chroma:latest
    container_name: bitcoder-client-chromadb
    restart: unless-stopped
    volumes:
      - chroma_data:/chroma/chroma
    environment:
      - ANONYMIZED_TELEMETRY=FALSE
      - ALLOW_RESET=TRUE
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/api/v1/heartbeat"]
      interval: 15s
      timeout: 5s
      retries: 5
    networks:
      - bitcoder-net

  rag-engine:
    image: bitcoder/rag-engine:latest
    container_name: bitcoder-client-rag-engine
    restart: unless-stopped
    env_file:
      - .env
    depends_on:
      postgres:
        condition: service_healthy
      chromadb:
        condition: service_healthy
    volumes:
      - upload_data:/app/uploads
    networks:
      - bitcoder-net

  agent:
    image: bitcoder/agent:latest
    container_name: bitcoder-client-agent
    restart: unless-stopped
    environment:
      - CLOUD_URL=\${CLOUD_URL}
      - AGENT_KEY=\${AGENT_KEY}
      - RAG_ENGINE_URL=http://rag-engine:8000
    depends_on:
      postgres:
        condition: service_healthy
      chromadb:
        condition: service_healthy
      rag-engine:
        condition: service_started
    volumes:
      - upload_data:/app/uploads
    networks:
      - bitcoder-net

volumes:
  postgres_data:
  chroma_data:
  upload_data:

networks:
  bitcoder-net:
    driver: bridge
`;

    res.setHeader('Content-Type', 'text/yaml');
    res.send(compose);
  }
}
