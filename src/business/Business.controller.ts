import { Controller, Post, Session, Body } from "@nestjs/common";
import { InjectAuthService } from "src/auth/decorators";
import { UserEntity } from "src/entities";
import { AuthService } from "src/auth/auth.service";

@Controller('api')
export class BusinessController {
  @InjectAuthService(UserEntity)
  private authService!: AuthService<UserEntity>;

  @Post('auth/login')
  async login(
    @Session() session: Express.Session,
    @Body() body: {
      username: string,
      password: string,
    }) {
    return { id: await this.authService.login(session, body.password, { username: body.username }) };
  }
}