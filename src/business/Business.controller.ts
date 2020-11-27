import { Controller, Post, Session, Body, Inject } from "@nestjs/common";
import { UserEntity } from "src/entities";
import { AuthService } from "src/auth/auth.service";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, getManager } from "typeorm";

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
    await getManager().transaction(async (manager) => {
      // const result = await manager.save(UserEntity, { name: 'name1', username: 'username1' } as any);
      await this.authService.setPassword(manager, 'UserEntity','20201126183802665359' as any,'password')
    });
  }
}