import { Injectable, Type } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, getRepository } from 'typeorm';
import { ID } from 'src/utils';
import { AccountEntity } from './authEntities';
import { Socket } from 'socket.io';
import { CudrBaseEntity } from 'src/cudr/CudrBase.entity';

const userType = new Array<Type<CudrBaseEntity & { account: AccountEntity }>>();

export function UserType() {
  return (klass: Type<CudrBaseEntity & { account: AccountEntity }>) => {
    userType.push(klass);
  }
}

@Injectable()
export class AuthService {
  private savedSocketStrMapAccount = new Map<string, AccountEntity>()
  private savedSocketMapSocketStr = new Map<string, string>()
  @InjectRepository(AccountEntity)
  private accountRepository!: Repository<AccountEntity>

  async login(session: Express.Session, { username, password }: any): Promise<ID | null> {
    let target = await this.accountRepository.findOne({ username, password });
    if (target === undefined) { return null; }
    session.savedUser = target;
    return target.id;
  }

  async accountSession(session: Express.Session): Promise<AccountEntity | null> {
    if (!session.savedUser) {
      return null;
    }
    return session.savedUser;
  }
  async accountSocket(socket: Socket): Promise<AccountEntity | null> {
    const socketStr = this.savedSocketMapSocketStr.get(socket.id);
    if (socketStr === undefined) { return null }
    const account = this.savedSocketStrMapAccount.get(socketStr);
    return account || null
  }
  async hasRole(session: Express.Session, roleName: string): Promise<boolean> {
    const account = await this.accountSession(session)
    if (!account) { return false }
    return account.groups.find((g) => g.roles.find(r => r.name === roleName)) !== undefined;
  }
  async logout(session: Express.Session) {
    session.destroy((err) => {
      throw err
    });
  }
  async toUserEntity(account: { id: ID }) {
    for await (const type of userType) {
      const target = await getRepository(type).findOne({ account });
      if (target) { return target }
    }
    return null;
  }
  async loadSocketStr(session: Express.Session) {
    const account = await this.accountSession(session);
    if (account === null) { return null }
    const str: string = session.savedSocketStr || `#${Math.random()}`;
    this.savedSocketStrMapAccount.set(str, account);
    return str;
  }
  async bindSocket(socket: Socket, socketStr: string) {
    if (this.savedSocketStrMapAccount.has(socketStr)) {
      this.savedSocketMapSocketStr.set(socket.id, socketStr);
      return true
    }
    return false
  }
}
