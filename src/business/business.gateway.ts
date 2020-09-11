import { SubscribeMessage, WebSocketGateway, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { Inject } from '@nestjs/common';
import { SocketAuthService } from 'src/auth/socket-auth.service';

@WebSocketGateway()
export class BusinessGateway {
  @Inject(SocketAuthService)
  socketAuthService!: SocketAuthService;

  @SubscribeMessage('getUser')
  async getUser(socket: Socket, payload: any) {
    const user = await this.socketAuthService.auth(socket);
    return user;
  }
}
