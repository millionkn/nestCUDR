import { createParamDecorator, ExecutionContext, ForbiddenException, Type } from '@nestjs/common';
import * as Auth from './Auth';
import { User } from './decorators';

export const CurrentUser = createParamDecorator(
  async (data: Type<User> | Array<Type<User>> | void, ctx: ExecutionContext) => {
    const contextType = ctx.getType()
    if (contextType === 'http') {
      const request = ctx.switchToHttp().getRequest<Express.Request>();
      if (!request.session) { throw new ForbiddenException('尚未登录'); }
      const account = await Auth.account(request.session);
      if (account === null) { throw new ForbiddenException('尚未登录'); }
      const user = await Auth.toUserEntity(account, data);
      if (user === null) { throw new ForbiddenException('尚未登录'); }
      return user;
    }
    throw `@CurrentUser 尚未实现 ${contextType}`
  },
);
