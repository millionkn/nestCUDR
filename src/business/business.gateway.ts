import { WebSocketGateway, SubscribeMessage, ConnectedSocket, MessageBody, WsException } from '@nestjs/websockets';
import { AuthService } from 'src/auth/auth.service';
import { UserEntity } from 'src/entities';
import { InjectAuthService } from 'src/auth/decorators';
import { Socket } from 'socket.io';

@WebSocketGateway()
export class BusinessGateway {
  @InjectAuthService(UserEntity)
  private authService!: AuthService<UserEntity>;

  @SubscribeMessage('login')
  async login(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: {
      username: string,
      password: string,
    },
  ) {
    return {
      id: await this.authService.login(client, data.password, { username: data.username }),
    }
  }
}
