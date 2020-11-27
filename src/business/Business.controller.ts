import { Controller, Post, Session, Body, Inject } from "@nestjs/common";
import { UserEntity } from "src/entities";
import { AuthService } from "src/auth/auth.service";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, getManager, getMetadataArgsStorage } from "typeorm";

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
    const result = await getManager().createQueryBuilder()
      .from(UserEntity,'user')
      .select('1')
      .leftJoin(`user.requirements`,'requirements')
      .addSelect('user.name','name')
      .addSelect('requirements','requirements')
      .getRawMany();
    console.log(result);
    return result;
  }
}