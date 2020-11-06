import { Injectable, CanActivate, ExecutionContext, ForbiddenException, HttpException } from '@nestjs/common';
import { getLoginState } from './tools';
import { WsException } from '@nestjs/websockets';
import { Reflector } from '@nestjs/core';
import { ID } from 'src/utils/entity';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private reflector: Reflector) { }
  async canActivate(
    context: ExecutionContext,
  ) {
    const authFun = this.reflector.get<((data: any, id: ID) => (boolean | Promise<boolean>))>('needLogin', context.getHandler());
    if (!authFun) { return true; }
    const type = context.getType();
    if (type === 'http') {
      const state = getLoginState(context.switchToHttp().getRequest<Express.Request>().session)
      if (!state.id) {
        throw new ForbiddenException('尚未登录');
      }
      return await authFun(state.data, state.id);
    } else if (type === 'ws') {
      const state = getLoginState(context.switchToWs().getClient())
      if (!state.id) {
        throw new WsException('尚未登录');
      }
      return await authFun(state.data, state.id);
    }
    return true;
  }
}
