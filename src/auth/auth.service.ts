import { EntityManager } from "typeorm";
import { AccountEntity, AuthableEntity } from "./entities";
import { Md5 } from "ts-md5";
import { CustomerError } from "@/customer-error";

export class AuthService<T extends AuthableEntity<any>> {
  async setPassword(manager: EntityManager, tableName: T extends AuthableEntity<infer X> ? X : never, targetId: T['id'], password: string): Promise<void> {
    const salt = `${Math.random()}`;
    const md5Result = Md5.hashStr(`${salt}${password}`) as string;
    const account = await manager.findOne(AccountEntity, { where: { tableName, targetId } });
    if (!account) {
      throw new CustomerError('用户不存在');
    }
    await manager.update(AccountEntity, {
      tableName: account.tableName,
      targetId: account.targetId,
    }, {
      password: md5Result,
      salt,
    })
  }
  async authentication(
    manager: EntityManager,
    entity: { id: T['id'] },
    tableName: T extends AuthableEntity<infer X> ? X : never,
    password: string,
  ) {
    const account = await manager.findOne(AccountEntity, {
      where: {
        tableName,
        targetId: entity.id,
      }
    });
    if (!account) { throw new CustomerError('用户名或密码错误'); }
    let md5Result = Md5.hashStr(`${account.salt}${password}`) as string;
    if (md5Result !== account.password) { throw new CustomerError(`用户名或密码错误`); }
  }
}