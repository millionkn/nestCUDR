import { Controller, Post, Session, Body, Inject } from "@nestjs/common";
import { UserEntity, UserRequirementEntity } from "@/business/entities";
import { AuthService } from "@/auth/auth.service";
import { InjectRepository } from "@nestjs/typeorm";
import { getManager, Repository } from "typeorm";
import { CustomerError } from "@/customer-error";
import { Session as SessionType } from 'express-session';
import { CurrentUserData, setCurrentUserData } from "@/sessionCurrentUser";
import { tableQuery } from "@/cudr/tableQuery/index";


@Controller('api')
export class BusinessController {
  @Inject(AuthService)
  private authService!: AuthService<UserEntity>;
  @InjectRepository(UserEntity)
  userRepository!: Repository<UserEntity>;

  @Post('auth/login')
  async login(
    @Session() session: SessionType,
    @Body() body: {
      username: string,
      password: string,
    },
  ) {
    const entity = await this.userRepository.findOne({ username: body.username });
    if (!entity) { throw new CustomerError('用户名或密码错误'); }
    await this.authService.authentication(getManager(), entity, 'UserEntity', body.password);
    setCurrentUserData(session, entity);
    return { id: entity.id };
  }

  @Post('test')
  async test(@CurrentUserData({ allowUndefined: true }) user: UserEntity) {
    return await tableQuery(UserRequirementEntity, {
      entity: ({ ref }) => ref((e) => e),
      requirement: ({ ref }) => ref((e) => e.user),
    }).query(getManager())
  }
}