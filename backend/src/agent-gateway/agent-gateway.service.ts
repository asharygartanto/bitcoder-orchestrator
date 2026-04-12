import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

interface PendingTask {
  resolve: (data: any) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
}

@Injectable()
export class AgentGatewayService implements OnModuleDestroy {
  private pendingTasks = new Map<string, PendingTask>();
  private clientTasks = new Map<string, Set<string>>();

  constructor() {}

  createTask(
    clientId: string,
    sendFn: (taskId: string) => boolean,
    timeoutMs: number = 60000,
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const taskId = uuidv4();

      const timeout = setTimeout(() => {
        this.cleanupTask(clientId, taskId);
        reject(new Error(`Task ${taskId} timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      this.pendingTasks.set(taskId, { resolve, reject, timeout });

      if (!this.clientTasks.has(clientId)) {
        this.clientTasks.set(clientId, new Set());
      }
      this.clientTasks.get(clientId)!.add(taskId);

      const sent = sendFn(taskId);
      if (!sent) {
        this.cleanupTask(clientId, taskId);
        reject(new Error('Agent not connected'));
      }
    });
  }

  resolveTask(clientId: string, taskId: string, data?: any, error?: string) {
    const task = this.pendingTasks.get(taskId);
    if (!task) return;

    this.cleanupTask(clientId, taskId);

    if (error) {
      task.reject(new Error(error));
    } else {
      task.resolve(data);
    }
  }

  rejectAllPending(clientId: string, reason: string) {
    const taskIds = this.clientTasks.get(clientId);
    if (!taskIds) return;

    for (const taskId of taskIds) {
      const task = this.pendingTasks.get(taskId);
      if (task) {
        clearTimeout(task.timeout);
        task.reject(new Error(reason));
        this.pendingTasks.delete(taskId);
      }
    }

    this.clientTasks.delete(clientId);
  }

  private cleanupTask(clientId: string, taskId: string) {
    this.pendingTasks.delete(taskId);
    const taskIds = this.clientTasks.get(clientId);
    if (taskIds) {
      taskIds.delete(taskId);
      if (taskIds.size === 0) {
        this.clientTasks.delete(clientId);
      }
    }
  }

  onModuleDestroy() {
    for (const [taskId, task] of this.pendingTasks) {
      clearTimeout(task.timeout);
      task.reject(new Error('Server shutting down'));
    }
    this.pendingTasks.clear();
    this.clientTasks.clear();
  }
}
