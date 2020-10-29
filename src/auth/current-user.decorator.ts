import { createParamDecorator, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { getSessionCurrentUser, getWsCurrentUser } from './tools';
import { Socket } from 'socket.io';
import { WsException } from '@nestjs/websockets';

export const CurrentUser = createParamDecorator(
  async (data: void, ctx: ExecutionContext) => {
    const contextType = ctx.getType()
    if (contextType === 'http') {
      const request = ctx.switchToHttp().getRequest<Express.Request>();
      if (!request.session) { throw new ForbiddenException('尚未登录'); }
      const currentUser = getSessionCurrentUser(request.session);
      if (currentUser === null) { throw new ForbiddenException('尚未登录'); }
      return currentUser;
    } else if (contextType === 'ws') {
      const ws = ctx.switchToWs().getClient<Socket>();
      const currentUser = getWsCurrentUser(ws);
      if (currentUser === null) { throw new WsException('尚未登录'); }
      return currentUser;
    }
    throw `@CurrentUser 尚未实现 ${contextType}`
  },
);
