import { ID, oneTimeFunc } from "src/utils";
import { getRepository } from "typeorm";
import { AccountEntity } from "./authEntities";
import { Type } from "@nestjs/common";
import { CudrBaseEntity } from "src/cudr/CudrBase.entity";

const accountRepository = oneTimeFunc(() => getRepository(AccountEntity));

const userType = new Array<Type<CudrBaseEntity & { account: AccountEntity }>>();

export function UserType() {
  return (klass: Type<CudrBaseEntity & { account: AccountEntity }>) => {
    userType.push(klass);
  }
}

export async function login(session: Express.SessionData, { username, password }: any): Promise<ID | null> {
  let target = await accountRepository().findOne({ username, password });
  if (!target) { return null }
  session.savedUser = target;
  return target.id;
}

export async function account(session: Express.SessionData): Promise<AccountEntity | null> {
  return session.savedUser || null;
}

export async function hasRole(session: Express.SessionData, roleName: string): Promise<boolean> {
  const accountEntity = await account(session)
  if (!accountEntity) { return false }
  return accountEntity.groups.find((g) => g.roles.find(r => r.name === roleName)) !== undefined;
}
export async function logout(session: Express.Session) {
  session.destroy((err) => {
    throw err
  });
}
export async function toUserEntity(account: { id: ID }) {
  for await (const type of userType) {
    const target = await getRepository(type).findOne({ account });
    if (target) { return target }
  }
  return null;
}