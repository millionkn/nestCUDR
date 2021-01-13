import { Controller, Post, Session, Body, Inject } from "@nestjs/common";
import { UserEntity, UserRequirementEntity } from "@/business/entities";
import { AuthService } from "@/auth/auth.service";
import { InjectRepository } from "@nestjs/typeorm";
import { getManager, Repository } from "typeorm";
import { CustomerError } from "@/customer-error";
import { Session as SessionType } from 'express-session';
import { CurrentUserData, setCurrentUserData } from "@/sessionCurrentUser";
import { tableQuery } from "@/cudr/tableQuery";


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
    await tableQuery(UserRequirementEntity, {
      entity: ({ ref }) => ref((e) => e),
      requirement: ({ ref }) => ref((e) => e.user.group.id),
      userName: ({ ref }) => ref(e => e.user.name),
      usersName: (({ ref }) => ref((e) => e.user.requirements.user.name)),
    })
      .byProperty((e) => e.requirement).filter(null).assert('isNull')
      .byProperty((e) => e.userName).filter({ like: '%aaa%' }).assert('notNull')
      .byArray((e) => e.usersName).filter('isEmpty')
      .query(getManager()).then(([result]) => {
        const a2 = result.entity;
        const a1 = result.requirement;
        const a3 = result.userName;
        const a4 = result.usersName;
        a2.date
      });
    return user;
  }
}