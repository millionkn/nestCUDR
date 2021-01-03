import { ID } from "@/utils/id";
import { CanActivate, createParamDecorator, ExecutionContext, Injectable, SetMetadata } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { CustomerError } from "./customer-error";
import { Session } from 'express-session';

export const CurrentUserData = createParamDecorator(
  async (data: void | { allowUndefined?: boolean }, ctx: ExecutionContext) => {
    const contextType = ctx.getType();
    if (contextType === 'http') {
      const request = ctx.switchToHttp().getRequest<Express.Request>();
      const userData = getCurrentUserData(request.session);
      if (userData) { return userData; }
      if (data && data.allowUndefined) {
        return undefined;
      } else {
        throw new CustomerError('尚未登录');
      }
    } else {
      throw `@${CurrentUserData.name} 尚未实现 ${contextType}`;
    }
  },
);

export function setCurrentUserData<T>(session: Session, data: any): T {
  return (session as any).currentUserData = data;
}
export function getCurrentUserData<T>(session: Session): T | undefined {
  return (session as any).currentUserData;
}

export const NeedLogin = (fun: (data: any, id: ID<any>) => (boolean | Promise<boolean>)) => SetMetadata('needLogin', fun);

@Injectable()
export class CurrentUserGuard implements CanActivate {
  constructor(private reflector: Reflector) { }
  async canActivate(
    context: ExecutionContext,
  ) {
    const authFun = this.reflector.get<((data: any, id: ID) => (boolean | Promise<boolean>))>('needLogin', context.getHandler());
    if (!authFun) { return true; }
    const type = context.getType();
    if (type === 'http') {
      const userData = getCurrentUserData(context.switchToHttp().getRequest<Express.Request>().session);
      if (userData !== undefined) {
        return true;
      } else {
        throw new CustomerError('尚未登录');
      }
    }
    return true;
  }
}
