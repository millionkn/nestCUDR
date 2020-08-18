import { SubscribeMessage, WebSocketGateway, MessageBody, ConnectedSocket } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { AuthService } from './auth.service';
import { Inject } from '@nestjs/common';

@WebSocketGateway()
export class AuthGateway {
  @Inject(AuthService)
  service!: AuthService;
  @SubscribeMessage('auth')
  async handleMessage(
    @MessageBody() socketStr: string,
    @ConnectedSocket() socket: Socket,
  ) {
    const result = await this.service.bindSocket(socket, socketStr);
    if (!result) { socket.error('无效的socketStr') }
    return true;
  }
}
