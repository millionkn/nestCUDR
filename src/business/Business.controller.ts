import { Controller, Post, Session, Body, Inject } from "@nestjs/common";
import { UserEntity } from "src/entities";
import { AuthService } from "src/auth/auth.service";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, getManager, getMetadataArgsStorage } from "typeorm";
import { tableQuery } from "src/cudr/tableQuery";

@Controller('api')
export class BusinessController {
  @Inject(AuthService)
  private authService!: AuthService<UserEntity>;
  @InjectRepository(UserEntity)
  userRepository!: Repository<UserEntity>;

  @Post('auth/login')
  async login(
    @Session() session: Express.Session,
    @Body() body: {
      username: string,
      password: string,
    },
  ) {
    const entity = await this.userRepository.findOne({ username: body.username });
    return { id: await this.authService.login(session, 'UserEntity', entity, body.password) };
  }

  @Post('test')
  async test() {
    const result = await tableQuery(UserEntity, {
      t_id: ({ path }) => path((e) => e.id),
      count: ({ count }) => count(e => e.groups),
      t_rs: ({ path }) => path(e => e.requirements.test),
      t_name: ({ path }) => path(e => e.name),
    })
      .query()
    console.log(result);
    return result;
  }
}