import { SubscribeMessage, WebSocketGateway } from '@nestjs/websockets';
import { Inject, ForbiddenException } from '@nestjs/common';
import { AuthService } from 'src/auth/auth.service';
import { Socket } from 'socket.io';

@WebSocketGateway()
export class BusinessGateway {
  @Inject(AuthService)
  auth!: AuthService;
  @SubscribeMessage('getUser')
  async getUser(socket: Socket, payload: any) {
    const account = await this.auth.accountSocket(socket);
    if (account === null) { throw new ForbiddenException('尚未登录') }
    const user = await this.auth.toUserEntity(account);
    if (user === null) { throw new ForbiddenException('未知用户') }
    return user;
  }
}
