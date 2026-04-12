import axios from 'axios';

interface HealthReport {
  postgres: { status: string; latencyMs: number } | null;
  chromadb: { status: string; latencyMs: number } | null;
  ragEngine: { status: string; latencyMs: number; version?: string } | null;
  disk: { usedPercent: number; totalGb: string; freeGb: string };
  memory: { usedPercent: number; totalMb: string; freeMb: string };
  uptime: number;
}

export class HealthMonitor {
  async check(): Promise<HealthReport> {
    const [postgres, chromadb, ragEngine, disk, memory] = await Promise.all([
      this.checkPostgres(),
      this.checkChromaDB(),
      this.checkRagEngine(),
      this.checkDisk(),
      this.checkMemory(),
    ]);

    return {
      postgres,
      chromadb,
      ragEngine,
      disk,
      memory,
      uptime: process.uptime(),
    };
  }

  private async checkPostgres(): Promise<HealthReport['postgres']> {
    try {
      const start = Date.now();
      const { execSync } = require('child_process');
      execSync('pg_isready -h postgres -p 5432', { timeout: 5000 });
      return { status: 'up', latencyMs: Date.now() - start };
    } catch {
      try {
        const start = Date.now();
        const { execSync } = require('child_process');
        execSync('pg_isready -h localhost -p 5432', { timeout: 5000 });
        return { status: 'up', latencyMs: Date.now() - start };
      } catch {
        return { status: 'down', latencyMs: -1 };
      }
    }
  }

  private async checkChromaDB(): Promise<HealthReport['chromadb']> {
    try {
      const start = Date.now();
      await axios.get('http://chromadb:8000/api/v1/heartbeat', { timeout: 5000 });
      return { status: 'up', latencyMs: Date.now() - start };
    } catch {
      try {
        const start = Date.now();
        await axios.get('http://localhost:8001/api/v1/heartbeat', { timeout: 5000 });
        return { status: 'up', latencyMs: Date.now() - start };
      } catch {
        return { status: 'down', latencyMs: -1 };
      }
    }
  }

  private async checkRagEngine(): Promise<HealthReport['ragEngine']> {
    try {
      const start = Date.now();
      const res = await axios.get('http://rag-engine:8000/api/health', { timeout: 5000 });
      return { status: 'up', latencyMs: Date.now() - start, version: res.data?.version };
    } catch {
      try {
        const start = Date.now();
        await axios.get('http://localhost:8000/api/health', { timeout: 5000 });
        return { status: 'up', latencyMs: Date.now() - start };
      } catch {
        return { status: 'down', latencyMs: -1 };
      }
    }
  }

  private async checkDisk(): Promise<HealthReport['disk']> {
    try {
      const { execSync } = require('child_process');
      const output = execSync("df -h /app | tail -1 | awk '{print $2,$3,$4,$5}'", { encoding: 'utf-8' });
      const parts = output.trim().split(/\s+/);
      return {
        totalGb: parts[0],
        freeGb: parts[2],
        usedPercent: parseInt(parts[3]) || 0,
      };
    } catch {
      return { totalGb: 'unknown', freeGb: 'unknown', usedPercent: 0 };
    }
  }

  private async checkMemory(): Promise<HealthReport['memory']> {
    try {
      const { execSync } = require('child_process');
      const output = execSync("free -m | grep Mem | awk '{print $2,$3,$4}'", { encoding: 'utf-8' });
      const parts = output.trim().split(/\s+/);
      const total = parseInt(parts[0]) || 1;
      const used = parseInt(parts[1]) || 0;
      return {
        totalMb: `${total}MB`,
        freeMb: `${parts[2]}MB`,
        usedPercent: Math.round((used / total) * 100),
      };
    } catch {
      return { totalMb: 'unknown', freeMb: 'unknown', usedPercent: 0 };
    }
  }
}
