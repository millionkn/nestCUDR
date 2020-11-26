import { createParamDecorator, ExecutionContext, SetMetadata } from "@nestjs/common";
import { Socket } from 'socket.io';
import { ID } from "src/utils/entity";
import { AuthService } from "./auth.service";

export const CurrentUserData: () => ParameterDecorator = createParamDecorator(
  async (data: void, ctx: ExecutionContext) => {
    const contextType = ctx.getType();
    if (contextType === 'http') {
      const request = ctx.switchToHttp().getRequest<Express.Request>();
      return AuthService.getLoginState(request.session).data;
    } else if (contextType === 'ws') {
      const ws = ctx.switchToWs().getClient<Socket>();
      return AuthService.getLoginState(ws).data;
    } else {
      throw `@${CurrentUserData.name} 尚未实现 ${contextType}`;
    }
  },
);

export const CurrentUserID: () => ParameterDecorator = createParamDecorator(
  async (data: void, ctx: ExecutionContext) => {
    const contextType = ctx.getType();
    if (contextType === 'http') {
      const request = ctx.switchToHttp().getRequest<Express.Request>();
      return AuthService.getLoginState(request.session).id;
    } else if (contextType === 'ws') {
      const ws = ctx.switchToWs().getClient<Socket>();
      return AuthService.getLoginState(ws).id;
    } else {
      throw `@${CurrentUserData.name} 尚未实现 ${contextType}`;
    }
  },
);

export const NeedLogin = (fun: (data: any, id: ID) => (boolean | Promise<boolean>)) => SetMetadata('needLogin', fun);