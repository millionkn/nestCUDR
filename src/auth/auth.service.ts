import { Repository, EntityManager } from "typeorm";
import { AccountEntity } from "./authEntities";
import { Md5 } from 'ts-md5';
import { ID, UnpackId } from "src/utils/entity";
import { Socket } from "socket.io";
import { CustomerError } from "src/customer-error";
import { InjectRepository } from "@nestjs/typeorm";

const socketData = new Map<string, any>();

export class AuthService<T extends { id: ID }> {
  @InjectRepository(AccountEntity)
  private repository!: Repository<AccountEntity>;

  async setPassword(manager: EntityManager, tableName: UnpackId<T['id']>, targetId: T['id'], password: string): Promise<void> {
    const salt = `${Math.random()}`;
    const md5Result = Md5.hashStr(`${salt}${password}`) as string;
    const account = await manager.findOne(AccountEntity, { where: { tableName, targetId } });
    if (account) {
      await manager.save(AccountEntity, {
        id: account.id,
        password: md5Result,
        salt,
      });
    } else {
      await manager.save(AccountEntity, {
        tableName,
        targetId,
        password: md5Result,
        salt,
      });
    }
  }
  async login(
    target: Socket | Express.Session,
    tableName: UnpackId<T['id']>,
    entity: { id: T['id'] } | undefined,
    password: string,
    dataOrFun?: any,
  ): Promise<void> {
    if (!(entity && entity.id)) { throw new CustomerError(`用户名或密码错误`); }
    const account = await this.repository.findOne({ targetId: entity.id, tableName });
    if (!account) { throw new CustomerError('用户名或密码错误'); }
    let md5Result = Md5.hashStr(`${account.salt}${password}`) as string;
    if (md5Result !== account.password) { throw new CustomerError(`用户名或密码错误`); }
    if ('cookie' in target) {
      target.currentUserState = {
        id: entity.id,
        data: dataOrFun === undefined ? {} : typeof dataOrFun === 'function' ? await dataOrFun() : dataOrFun,
      }
    } else if ('client' in target) {
      socketData.set(target.id, {
        id: entity.id,
        data: dataOrFun === undefined ? {} : typeof dataOrFun === 'function' ? await dataOrFun() : dataOrFun,
      });
      target.on('disconnect', () => {
        socketData.delete(target.id);
      });
    } else {
      throw new Error(`无效的登录对象`);
    }
  }
  static getLoginState(target: Socket | Express.Session | undefined) {
    let ret: { id?: ID, data?: any } | undefined;
    if (target) {
      if ('cookie' in target) {
        ret = target.currentUserState;
      } else if ('client' in target) {
        ret = socketData.get(target.id);
      } else {
        throw new Error(`无效的登录对象`);
      }
    }
    return ret || {};
  }
}