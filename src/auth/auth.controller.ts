import { Controller, Post, Body, Session, ForbiddenException, Get, Inject, BadRequestException } from '@nestjs/common';
import * as Auth from './Auth';
import { CurrentUser } from './current-user.decorator';
import { SocketMapSession } from '../socket-map-session';

@Controller('api/auth')
export class AuthController {
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

  @Post('socketAuth')
  async socketAuth(@CurrentUser() user: any, @Session() session: Express.Session, @Body() body: { token: string }) {
    const result = await SocketMapSession.bindToken(session, body);
    if (result === null) { throw new BadRequestException('无效的socketToken') }
  }
}
