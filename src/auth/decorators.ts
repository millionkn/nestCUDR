import { createKlassDecorator } from "src/utils/decorator";
import { AccountEntity } from "./authEntities";

export const UserType = createKlassDecorator(`UserType`, () => (opt: {
  userType: string,
  accountRef: (obj: any) => AccountEntity,
  usernameRef: (obj: any) => string,
  extraWhere?: { [k: string]: any }
}) => {
  return opt;
});