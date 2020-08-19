import { SubscribeMessage, WebSocketGateway, OnGatewayConnection } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { CurrentUser } from 'src/auth/current-user.decorator';
import { SocketMapSession } from 'src/socket-map-session';

@WebSocketGateway()
export class BusinessGateway implements OnGatewayConnection {

  @SubscribeMessage('getUser')
  async getUser(socket: Socket, payload: any, @CurrentUser() user: any) {
    return user;
  }
  async handleConnection(client: Socket) {
    client.emit('auth', await SocketMapSession.createToken(client));
  }
}
