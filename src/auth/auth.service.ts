import { FindConditions, Repository } from "typeorm";
import { AccountEntity } from "./authEntities";
import { Type } from "@nestjs/common";
import { Md5 } from 'ts-md5';
import { AuthError } from "./errors";
import { ID } from "src/utils/entity";
import { QueryDeepPartialEntity } from "typeorm/query-builder/QueryPartialEntity";
import { Socket } from "socket.io";
import { setLoginState } from "./tools";

export class AuthService<T extends { id: ID }> {
  constructor(
    private repository: Repository<T>,
    private klass: Type<T>,
    private info: {
      accountKey: string,
    },
  ) { }
  private async findId(password: string, where: FindConditions<T>): Promise<T['id']> {
    const entity = await this.repository.findOne({
      where,
      relations: [
        this.info.accountKey,
      ],
    });
    if (!entity) { throw new AuthError(`用户名或密码错误`); }
    const account: AccountEntity | undefined = (entity as any)[this.info.accountKey];
    if (!account) { throw new AuthError(`未关联Account`); }
    let md5Result = Md5.hashStr(`${account.salt}${password}`) as string;
    if (md5Result !== account.password) { throw new AuthError(`用户名或密码错误`); }
    return entity.id;
  }
  async register(entity: QueryDeepPartialEntity<T>, password: string): Promise<T['id']> {
    return await this.repository.manager.transaction(async (manager) => {
      const salt = `${Math.random()}`;
      const md5Result = Md5.hashStr(`${salt}${password}`) as string;
      const accountInsertResult = await manager.insert(AccountEntity, {
        password: md5Result,
        salt,
      });
      const entityInsertResult = await manager.insert(this.klass, {
        ...entity,
        [this.info.accountKey]: accountInsertResult.identifiers[0],
      })
      return entityInsertResult.identifiers[0].id;
    })
  }
  async login<Data extends object>(
    target: Socket | Express.Session,
    password: string,
    where: FindConditions<T>,
    dataOrFun?: Data | ((id: T['id']) => (Promise<Data> | Data)),
  ): Promise<T['id']> {
    const id = await this.findId(password, where);
    await setLoginState(target, id, dataOrFun);
    return id;
  }
}