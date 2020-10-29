import { getRepository } from "typeorm";
import { AccountEntity } from "./authEntities";
import { Inject, Injectable } from "@nestjs/common";
import { Md5 } from 'ts-md5';
import { AuthError } from "./errors";
import { ID } from "src/utils/entity";
import { AuthControllerMapSym, AuthControllerInfoMap } from "./tools";

@Injectable()
export class AuthService {
  @Inject(AuthControllerMapSym)
  authMap!: AuthControllerInfoMap;
  async findId(opt: {
    userType: string,
    username: string,
    password: string,
  }):Promise<ID> {
    const info = this.authMap.get(opt.userType.toLowerCase());
    if (!info) { throw new AuthError('usetType不存在'); }
    const entity = await getRepository(info.klass).findOne({
      relations: [
        info.accountKey,
      ],
      where: {
        [info.usernameKey]: opt.username,
      },
    });
    if (!entity) { throw new AuthError(`用户名或密码错误`); }
    const account = entity[info.accountKey];
    if (!account) { throw new AuthError(`未关联Account`); }
    let md5Result = Md5.hashStr(`${account.salt}${opt.password}`) as string;
    if (md5Result !== account.password) { throw new AuthError(`用户名或密码错误`); }
    return entity.id;
  }
  async createAccount(password: string): Promise<AccountEntity['id']> {
    const salt = `${Math.random()}`;
    const md5Result = Md5.hashStr(`${salt}${password}`) as string;
    const insertResult = await getRepository(AccountEntity).insert({
      password: md5Result,
      salt,
    });
    return insertResult.identifiers[0].id;
  }
}