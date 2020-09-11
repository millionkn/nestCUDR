import { createDecorator } from "src/utils/decorator";
import { Type } from "@nestjs/common";
import { CudrBaseEntity } from "src/cudr/CudrBase.entity";
import { AccountEntity } from "./authEntities";

export type User = CudrBaseEntity & { account: AccountEntity };

export const UserType = createDecorator(`UserType`, (
  meta: void,
  klass: Type<any>,
) => { });