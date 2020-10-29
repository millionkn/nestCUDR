import { SubscribeMessage, WebSocketGateway, MessageBody, ConnectedSocket, WsException, WsResponse } from '@nestjs/websockets';
import { Inject } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Socket } from 'socket.io';
import { AuthError } from './errors';
import { setWsCurrentUser, CurrentUserData } from './tools';
import { CurrentUser } from './current-user.decorator';

@WebSocketGateway()
export class AuthGateway {
  @Inject(AuthService)
  private authService!: AuthService;
  @SubscribeMessage('login')
  async login(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: {
      userType: string,
      username: string,
      password: string,
    },
  ) {
    try {
      const userId = await this.authService.findId(data);
      return setWsCurrentUser(client, { userId });
    } catch (e) {
      if (e instanceof AuthError) {
        throw new WsException(e.message);
      } else {
        throw e;
      }
    }
  }
  @SubscribeMessage('currentUser')
  async currentUser(@CurrentUser() user: CurrentUserData) {
    return user;
  }
}
