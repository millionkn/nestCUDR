import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ID } from 'src/utils/entity';
import { AuthService } from './auth.service';
import { CustomerError } from 'src/customer-error';

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
      const state = AuthService.getLoginState(context.switchToHttp().getRequest<Express.Request>().session)
      if (!state.id) {
        throw new CustomerError('尚未登录');
      }
      return await authFun(state.data, state.id);
    } else if (type === 'ws') {
      const state = AuthService.getLoginState(context.switchToWs().getClient())
      if (!state.id) {
        throw new CustomerError('尚未登录');
      }
      return await authFun(state.data, state.id);
    }
    return true;
  }
}
