import { Controller, Post, Session, Body, Inject } from "@nestjs/common";
import { RequirementLogEntity, UserEntity } from "@/business/entities";
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
    await tableQuery(RequirementLogEntity, {
      entity: ({ ref }) => ref((e) => e),
      requirement: ({ ref }) => ref((e) => e.requirement),
      // requirementsArrayCount: ({ join }) => join(r1).count(),
      // requirementsTestSum: ({ join }) => join(r1).sum(e => e.num),
      logName: ({ ref }) => ref(e => e.name),
      userName: (({ ref }) => ref((e) => e.requirement.user.name)),
    })
      .byProperty((e) => e.requirement).filter(null).assert(false)
      .byProperty((e) => e.logName).filter({ like: '%aaa%' }).assert(null)
      // .byProperty((e) => e.requirementsArrayCount).filter({ moreOrEqual: 1 }).assertNull(null)
      // .byProperty((e) => e.logName).sort('DESC').setNullOn(null)
      .query(getManager()).then(([result]) => {
        const requirment = result.requirement;
      });
    return user;
  }
}