import { Controller, Post, Session, Body, Inject } from "@nestjs/common";
import { UserEntity } from "@/entities";
import { AuthService } from "@/auth/auth.service";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

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
    await this.authService.login(session, 'UserEntity', entity, body.password);
    return { id: entity!.id };
  }

  @Post('test')
  async test() {
  }
}