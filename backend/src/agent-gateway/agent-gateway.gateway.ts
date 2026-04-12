import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { AgentGatewayService } from './agent-gateway.service';
import { ClientService } from '../client/client.service';
import { LicenseService } from '../license/license.service';

@WebSocketGateway({
  namespace: '/agent',
  cors: {
    origin: '*',
    credentials: true,
  },
  transports: ['websocket'],
})
export class AgentGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private agentSockets = new Map<string, Socket>();

  constructor(
    private agentGatewayService: AgentGatewayService,
    private clientService: ClientService,
    private licenseService: LicenseService,
  ) {}

  async handleConnection(client: Socket) {
    const agentKey = client.handshake.auth?.agentKey || client.handshake.query?.agentKey;
    const licenseKey = client.handshake.auth?.licenseKey || client.handshake.query?.licenseKey;

    if (!agentKey || typeof agentKey !== 'string') {
      client.emit('error', { message: 'Agent key required' });
      client.disconnect(true);
      return;
    }

    if (!licenseKey || typeof licenseKey !== 'string') {
      client.emit('error', { message: 'License key required' });
      client.disconnect(true);
      return;
    }

    const validation = await this.licenseService.validate(licenseKey);
    if (!validation.valid) {
      client.emit('error', { message: validation.error });
      client.disconnect(true);
      return;
    }

    const clientRecord = await this.clientService.findByAgentKey(agentKey);
    if (!clientRecord) {
      client.emit('error', { message: 'Invalid agent key' });
      client.disconnect(true);
      return;
    }

    client.data.clientId = clientRecord.id;
    client.data.organizationId = clientRecord.organizationId;
    client.data.licenseId = validation.license.id;
    this.agentSockets.set(clientRecord.id, client);

    await this.clientService.updateStatus(clientRecord.id, 'ONLINE');

    const config = this.clientService.getClientConfig(clientRecord);
    client.emit('config', config);
    client.emit('license', validation.license);

    console.log(`Agent connected: ${clientRecord.name} (${clientRecord.id}) - License: ${validation.license.companyName}`);
  }

  async handleDisconnect(client: Socket) {
    const clientId: string | undefined = client.data.clientId;
    if (!clientId) return;

    this.agentSockets.delete(clientId);
    this.agentGatewayService.rejectAllPending(clientId, 'Agent disconnected');
    await this.clientService.updateStatus(clientId, 'OFFLINE');

    console.log(`Agent disconnected: ${clientId}`);
  }

  @SubscribeMessage('health')
  async handleHealth(client: Socket, payload: any) {
    const clientId: string = client.data.clientId;
    if (!clientId) return;

    await this.clientService.updateStatus(clientId, 'ONLINE', payload);
  }

  @SubscribeMessage('task_result')
  handleTaskResult(client: Socket, payload: { id: string; data?: any; error?: string }) {
    const clientId: string = client.data.clientId;
    if (!clientId) return;

    this.agentGatewayService.resolveTask(clientId, payload.id, payload.data, payload.error);
  }

  getSocket(clientId: string): Socket | undefined {
    return this.agentSockets.get(clientId);
  }
}
