import { Injectable, BadRequestException, Type } from '@nestjs/common';
import { Socket } from 'socket.io';
import { account, toUserEntity } from './Auth';
import { User } from './decorators';

@Injectable()
export class SocketAuthService {
  private authing = new Map<number, (session: Express.Session) => void>();
  private authed = new Map<string, User>();
  bindSession(session: Express.Session, token: { token: number }) {
    if (token && token.token) {
      const fun = this.authing.get(token.token);
      if (fun) {
        this.authing.delete(token.token);
        return fun(session);
      }
    }
    throw new BadRequestException('无效的token')
  }
  async auth(socket: Socket, userType: Type<User> | Array<Type<User>> | void) {
    const authed = this.authed.get(socket.id);
    if (authed) { return authed; }
    const token = { token: Math.random() };
    const session = await new Promise<Express.Session>(res => {
      this.authing.set(token.token, res);
      socket.emit('auth', token);
    });
    const user = await toUserEntity(await account(session), userType);
    if (user === null) { throw new Error('认证失败'); }
    this.authed.set(socket.id, user);
    socket.on('disconnect', () => {
      this.authed.delete(socket.id);
    })
    return user;
  }
}
