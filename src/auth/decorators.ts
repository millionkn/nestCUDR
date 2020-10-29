import { createKlassDecorator, createKeyDecorator, loadDecoratedKeys } from "src/utils/decorator";

export const UserType = createKlassDecorator(`UserType`, (klass) => (opt: {
  userType: string,
  extraWhere?: { [k: string]: any }
}) => {
  const accountRef = loadDecoratedKeys(AccountRef, klass);
  const usernameRef = loadDecoratedKeys(UsernameRef, klass);
  if (accountRef.length !== 1 && usernameRef.length !== 1) {
    throw new Error(`${klass.name} 必须有一个${AccountRef.name}与一个${UsernameRef.name}`)
  }
  const accountKey = accountRef[0];
  const usernameKey = usernameRef[0];
  if (typeof accountKey === 'symbol' || typeof usernameKey === 'symbol') {
    throw new Error(`不能使用symbol`);
  }
  return {
    ...opt,
    accountKey,
    usernameKey,
  };
});

export const AccountRef = createKeyDecorator(`AccountRef`, (klass, key) => () => {
  return { key }
});

export const UsernameRef = createKeyDecorator(`UsernameRef`, (klass, key) => () => {
  return { key }
})