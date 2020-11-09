import { createKlassDecorator, createKeyDecorator, loadDecoratedKeys, loadDecoratorData } from "src/utils/decorator";
import { Type, Inject, createParamDecorator, ExecutionContext, SetMetadata } from "@nestjs/common";
import { Socket } from 'socket.io';
import { getLoginState } from './tools';
import { ID } from "src/utils/entity";

export const UserType = createKlassDecorator(`UserType`, (klass) => () => {
  const accountRef = loadDecoratedKeys(AccountRef, klass);
  if (accountRef.length !== 1) {
    throw new Error(`${klass.name} 必须有一个${AccountRef.name}`)
  }
  const accountKey = accountRef[0];
  if (typeof accountKey === 'symbol') {
    throw new Error(`不能使用symbol`);
  }
  return {
    injectSym: Symbol(`UserType:${klass.name}`),
    accountKey,
  };
});

export const AccountRef = createKeyDecorator(`AccountRef`, (klass, key) => () => {
  return { key }
});

export function getAuthServiceToken(klass: Type<any>) {
  return loadDecoratorData(UserType, klass).injectSym;
}

export function InjectAuthService(klass: Type<any>) {
  return Inject(getAuthServiceToken(klass));
}

export const CurrentUserData: () => ParameterDecorator = createParamDecorator(
  async (data: void, ctx: ExecutionContext) => {
    const contextType = ctx.getType();
    let state: ReturnType<typeof getLoginState>;
    if (contextType === 'http') {
      const request = ctx.switchToHttp().getRequest<Express.Request>();
      state = getLoginState(request.session);
    } else if (contextType === 'ws') {
      const ws = ctx.switchToWs().getClient<Socket>();
      state = getLoginState(ws);
    } else {
      throw `@${CurrentUserData.name} 尚未实现 ${contextType}`;
    }
    return state.data;
  },
);

export const CurrentUserID: () => ParameterDecorator = createParamDecorator(
  async (data: void, ctx: ExecutionContext) => {
    const contextType = ctx.getType();
    let state: ReturnType<typeof getLoginState>;
    if (contextType === 'http') {
      const request = ctx.switchToHttp().getRequest<Express.Request>();
      state = getLoginState(request.session);
    } else if (contextType === 'ws') {
      const ws = ctx.switchToWs().getClient<Socket>();
      state = getLoginState(ws);
    } else {
      throw `@${CurrentUserID.name} 尚未实现 ${contextType}`;
    }
    return state.id;
  },
);

export const NeedLogin = (fun: (data: any, id: ID) => (boolean | Promise<boolean>)) => SetMetadata('needLogin', fun);