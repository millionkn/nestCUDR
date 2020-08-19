import { createParamDecorator, ExecutionContext, ForbiddenException } from '@nestjs/common';
import * as Auth from './Auth';
import { Socket } from 'socket.io';
import { SocketMapSession } from 'src/socket-map-session';
import { WsException } from '@nestjs/websockets';

export async function getCurrentUserSocket(socket: Socket) {
  const sessionData = await SocketMapSession.getSession(socket);
  if (sessionData === null) { throw new WsException({ err: '尚未验证的socket' }) }
  const account = await Auth.account(sessionData);
  if (!account) { throw new WsException({ err: '尚未登录' }) }
  const user = await Auth.toUserEntity(account);
  if (!user) { throw new WsException({ err: '用户未绑定业务角色' }) }
  return user;
}

export async function getCurrentUserSession(session: Express.SessionData) {
  const account = await Auth.account(session);
  if (!account) { throw new ForbiddenException('尚未登录') }
  const user = await Auth.toUserEntity(account);
  if (!user) { throw new ForbiddenException('用户未绑定业务角色') }
  return user;
}

export const CurrentUser = createParamDecorator(
  async (data: unknown, ctx: ExecutionContext) => {
    const contextType = ctx.getType()
    if (contextType === 'http') {
      const request = ctx.switchToHttp().getRequest<Express.Request>();
      if (!request.session) { throw new ForbiddenException('尚未登录') }
      return getCurrentUserSession(request.session)
    } else if (contextType === 'ws') {
      const ws = ctx.switchToWs();
      const socket = ws.getClient<Socket>();
      return getCurrentUserSocket(socket)
    }
    throw `@CurrentUser 尚未实现 ${contextType}`
  },
);
