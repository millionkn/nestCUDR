import { Body, Controller, ForbiddenException, Post, Session, Inject } from '@nestjs/common';
import * as Auth from './Auth';
import { CurrentUser } from './current-user.decorator';
import { SocketAuthService } from './socket-auth.service';

@Controller('api/auth')
export class AuthController {
  @Inject(SocketAuthService)
  socketAuthService!: SocketAuthService;
  @Post('login')
  async login(@Body() body: any, @Session() session: Express.Session) {
    let userId = await Auth.login(session, body)
    if (userId === null) {
      throw new ForbiddenException('登录失败:用户名或密码错误');
    }
    return { userId };
  }

  @Post('currentUser')
  async currentUser(@CurrentUser() user: any) {
    return await user
  }

  @Post('logout')
  async logout(@Session() session: Express.Session) {
    await Auth.logout(session);
  }
  @Post('hasRole')
  async hasRole(@Session() session: Express.Session, @Body() roles: string[]) {
    for await (const role of roles) {
      const hasRole = await Auth.hasRole(session, role);
      if (!hasRole) { return false; }
    }
    return true;
  }
  @Post(`socket`)
  async socket(@Session() session: Express.Session, @Body() body: { token: number }) {
    this.socketAuthService.bindSession(session, body);
  }
}
