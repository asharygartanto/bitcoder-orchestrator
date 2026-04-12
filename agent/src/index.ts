import { io, Socket } from 'socket.io-client';
import { HealthMonitor } from './health-monitor';
import { TaskHandler } from './task-handler';

const CLOUD_URL = process.env.CLOUD_URL || 'https://orchestrator.gartanto.site';
const AGENT_KEY = process.env.AGENT_KEY || '';
const HEALTH_INTERVAL = 30000;

if (!AGENT_KEY) {
  console.error('AGENT_KEY is required');
  process.exit(1);
}

class BitcoderAgent {
  private socket: Socket;
  private healthMonitor: HealthMonitor;
  private taskHandler: TaskHandler;
  private reconnectAttempts = 0;

  constructor() {
    this.socket = io(`${CLOUD_URL}/api/agent`, {
      transports: ['websocket'],
      auth: { agentKey: AGENT_KEY },
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 60000,
    });

    this.healthMonitor = new HealthMonitor();
    this.taskHandler = new TaskHandler();

    this.setupEventHandlers();
    this.startHealthReporting();
  }

  private setupEventHandlers() {
    this.socket.on('connect', () => {
      console.log(`Connected to ${CLOUD_URL}`);
      this.reconnectAttempts = 0;
    });

    this.socket.on('disconnect', (reason) => {
      console.log(`Disconnected: ${reason}`);
    });

    this.socket.on('connect_error', (err) => {
      this.reconnectAttempts++;
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 60000);
      console.error(`Connection error (attempt ${this.reconnectAttempts}): ${err.message}. Retry in ${delay}ms`);
    });

    this.socket.on('config', (config: any) => {
      console.log('Received config from cloud');
      this.taskHandler.updateConfig(config);
    });

    this.socket.on('task', async (task: { id: string; action: string; payload: any }) => {
      console.log(`Task received: ${task.action} (${task.id})`);
      try {
        const result = await this.taskHandler.handle(task.action, task.payload);
        this.socket.emit('task_result', { id: task.id, data: result });
      } catch (err: any) {
        console.error(`Task error: ${task.action}`, err.message);
        this.socket.emit('task_result', { id: task.id, error: err.message });
      }
    });
  }

  private startHealthReporting() {
    const report = async () => {
      try {
        const health = await this.healthMonitor.check();
        this.socket.emit('health', health);
      } catch (err: any) {
        console.error('Health report failed:', err.message);
      }
    };

    setInterval(report, HEALTH_INTERVAL);
    setTimeout(report, 5000);
  }
}

new BitcoderAgent();
