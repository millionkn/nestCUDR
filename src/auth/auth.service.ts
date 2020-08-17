import { Injectable, Type } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, getRepository } from 'typeorm';
import { ID } from 'src/cudr/cudr.module';
import { AccountEntity } from './authEntities';

const userType = new Array<Type<{ account: AccountEntity }>>();

export function UserType() {
  return (klass: Type<{ account: AccountEntity }>) => {
    userType.push(klass);
  }
}

@Injectable()
export class AuthService {

  @InjectRepository(AccountEntity)
  private accountRepository!: Repository<AccountEntity>

  async login(session: Express.Session, { username, password }: any): Promise<ID | null> {
    let target = await this.accountRepository.findOne({ username, password });
    if (target === undefined) { return null; }
    session.savedUser = target;
    return target.id;
  }

  async account(session: Express.Session): Promise<AccountEntity | null> {
    if (!session.savedUser) {
      return null;
    }
    return session.savedUser;
  }
  async hasRole(session: Express.Session, roleName: string): Promise<boolean> {
    const account = await this.account(session)
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
}
