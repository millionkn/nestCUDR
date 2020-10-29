import { Controller, Inject, Post, Body, ForbiddenException, Session } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { setSessionCurrentUser, CurrentUserData } from "./tools";
import { AuthError } from "./errors";
import { CurrentUser } from "./current-user.decorator";

@Controller('api/auth')
export class AuthController {
  @Inject(AuthService)
  private authService!: AuthService;
  
  @Post('login')
  async login(
    @Session() session: Express.Session,
    @Body() body: {
      userType: string,
      username: string,
      password: string,
    }) {
    try {
      let userId = await this.authService.findId(body);
      return setSessionCurrentUser(session, { userId });
    } catch (e) {
      if (e instanceof AuthError) {
        throw new ForbiddenException(e.message);
      } else {
        throw e;
      }
    }
  }

  @Post('currentUser')
  async currentUser(@CurrentUser() user: CurrentUserData) {
    return user;
  }

  @Post('logout')
  async logout(@Session() session: Express.Session) {
    session.destroy(() => { });
  }

}