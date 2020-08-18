import { SubscribeMessage, WebSocketGateway } from '@nestjs/websockets';
import { Inject } from '@nestjs/common';
import { AuthService } from 'src/auth/auth.service';
import { Socket } from 'socket.io';

@WebSocketGateway()
export class BusinessGateway {
  @Inject(AuthService)
  auth!: AuthService;
  @SubscribeMessage('getUser')
  async handleMessage(socket: Socket, payload: any) {
    const account = await this.auth.accountSocket(socket);
    if (account === null) { throw '尚未登录' }
    const user = await this.auth.toUserEntity(account);
    if (user === null) { throw '未知用户' }
    return user;
  }
}
