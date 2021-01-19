import { Controller, Post, Session, Body, Inject } from "@nestjs/common";
import { UserEntity } from "@/entities";
import { AuthService } from "@/auth/auth.service";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CustomerError } from "@/customer-error";
import { Session as SessionType } from 'express-session';

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
    await this.authService.login(session, 'UserEntity', entity, body.password);
  }

  @Post('test')
  async test() {
  }
}