import { SubscribeMessage, WebSocketGateway } from '@nestjs/websockets';
import { ID } from 'src/utils/entity';
import { CurrentUserID, NeedLogin } from './decorators';

@WebSocketGateway()
export class AuthGateway {
  @NeedLogin(() => true)
  @SubscribeMessage('currentUser')
  async currentUser(@CurrentUserID() id: ID) {
    return { id };
  }
}
