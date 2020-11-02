import { Controller, Post, Session, Body, ForbiddenException } from "@nestjs/common";
import { InjectAuthService } from "src/auth/decorators";
import { UserEntity } from "src/entities";
import { AuthService } from "src/auth/auth.service";
import { AuthError } from "src/auth/errors";

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
    try {
      return { id: await this.authService.login(session, body.password, { username: body.username }) };
    } catch (e) {
      if (e instanceof AuthError) {
        throw new ForbiddenException(e.message);
      } else {
        throw e;
      }
    }
  }
}