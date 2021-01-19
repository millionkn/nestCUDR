import { WebSocketGateway, SubscribeMessage, ConnectedSocket, MessageBody } from "@nestjs/websockets";
import { AuthService } from "@/auth/auth.service";
import { UserEntity } from "@/entities";
import { Socket } from "socket.io";
import { Inject, UseFilters } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CustomerErrorFilter } from "@/customer-error.filter";
import { CustomerError } from "@/customer-error";

@UseFilters(CustomerErrorFilter)
@WebSocketGateway()
export class BusinessGateway {
  @Inject(AuthService)
  private authService!: AuthService<UserEntity>;
  @InjectRepository(UserEntity)
  userRepository!: Repository<UserEntity>;

  @SubscribeMessage('login')
  async login(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: {
      username: string,
      password: string,
    },
  ) {
    const entity = await this.userRepository.findOne({ username: data.username });
    if (!entity) { throw new CustomerError('用户名或密码错误'); }
    await this.authService.login(client, 'UserEntity', entity, data.password);
  }
}
