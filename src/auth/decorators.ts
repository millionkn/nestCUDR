import { createKlassDecorator } from "src/utils/decorator";
import { CudrBaseEntity } from "src/cudr/CudrBase.entity";
import { AccountEntity } from "./authEntities";

export type User = CudrBaseEntity & { account: AccountEntity };

export const UserType = createKlassDecorator(`UserType`, () => (
) => { });