import { SubscribeMessage, WebSocketGateway } from '@nestjs/websockets';
import { ID } from 'src/utils/entity';
import { CurrentUserID } from './decorators';

@WebSocketGateway()
export class AuthGateway {
  @SubscribeMessage('currentUser')
  async currentUser(@CurrentUserID() id: ID) {
    return { id };
  }
}
