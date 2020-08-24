import { SubscribeMessage, WebSocketGateway, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { CurrentUser } from 'src/auth/current-user.decorator';
import { AuthGateway } from 'src/auth/AuthGateway.decorator';

@WebSocketGateway()
@AuthGateway()
export class BusinessGateway implements OnGatewayConnection,OnGatewayDisconnect {
  @SubscribeMessage('getUser')
  async getUser(socket: Socket, payload: any, @CurrentUser() user: any) {
    return user;
  }
  async handleConnection(client: Socket) {
  }
  handleDisconnect(client: Socket) {
  }
}
