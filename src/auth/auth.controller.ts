import { Controller, Inject, Post, Body, Session, Res, UseGuards, forwardRef, ForbiddenException } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('api/auth')
export class AuthController {
  @Inject(forwardRef(() => AuthService))
  authService!: AuthService;

  @Post('login')
  async login(@Body() body: any, @Session() session: Express.Session) {
    let userId = await this.authService.login(session, body)
    if (userId === null) {
      throw new ForbiddenException('登录失败:用户名或密码错误');
    }
    return { userId };
  }

  @Post('currentUser')
  async currentUser(@Session() session: Express.Session) {
    return await this.authService.accountSession(session);
  }

  @Post('logout')
  async logout(@Session() session: Express.Session) {
    await this.authService.logout(session);
  }
  @Post('hasRole')
  async hasRole(@Session() session: Express.Session, @Body() roles: string[]) {
    for await (const role of roles) {
      const hasRole = await this.authService.hasRole(session, role);
      if (!hasRole) { return false; }
    }
    return true;
  }
  @Post('socketStr')
  async socketStr(@Session() session: Express.Session) {
    const str = await this.authService.loadSocketStr(session);
    if (str === null) {
      throw new ForbiddenException('尚未登录')
    }
    return { str };
  }
}
