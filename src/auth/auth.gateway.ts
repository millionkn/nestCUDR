import { SubscribeMessage, WebSocketGateway } from "@nestjs/websockets";
import { ID } from "@/utils/entity";
import { CurrentUserID, NeedLogin } from "./decorators";
import { UseFilters } from "@nestjs/common";
import { CustomerErrorFilter } from "@/customer-error.filter";

@UseFilters(CustomerErrorFilter)
@WebSocketGateway()
export class AuthGateway {
  @NeedLogin(() => true)
  @SubscribeMessage('currentUser')
  async currentUser(@CurrentUserID() id: ID) {
    return { id };
  }
}
