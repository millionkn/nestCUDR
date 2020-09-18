import { getRepository } from "typeorm";
import { AccountEntity } from "./authEntities";
import { Type } from "@nestjs/common";
import { oneTimeFunc } from "src/utils/oneTimeFunc";
import { ID } from "src/utils/entity";
import { UserType, User } from "./decorators";
import { loadDecoratedKlass } from "src/utils/decorator";

const accountRepository = oneTimeFunc(() => getRepository(AccountEntity));

export async function login(session: Express.Session, { username, password }: any): Promise<ID<any> | null> {
  let target = await accountRepository().findOne({ username, password });
  if (!target) { return null }
  const user = await toUserEntity(target);
  if (user === null) {
    return null;
  } else {
    session.savedUser = target;
    return user.id;
  }
}

export async function account(session: Express.Session): Promise<AccountEntity | null> {
  return session.savedUser || null;
}

export async function hasRole(session: Express.Session, roleName: string): Promise<boolean> {
  const accountEntity = await account(session)
  if (!accountEntity) { return false }
  return accountEntity.groups.find((g) => g.roles.find(r => r.name === roleName)) !== undefined;
}
export async function logout(session: Express.Session) {
  session.destroy((err) => {
    if (err) { throw err }
  });
}

export async function toUserEntity(
  account: { id: AccountEntity['id'] } | null,
  klasses: Type<User> | Array<Type<User>> | void,
) {
  if (account === null) { return null }
  if (klasses === undefined) { klasses = loadDecoratedKlass(UserType); }
  if (!(klasses instanceof Array)) { klasses = [klasses]; }
  for await (const klass of klasses) {
    const target = await getRepository(klass).findOne({ account });
    if (target) { return target; }
  }
  return null;
}