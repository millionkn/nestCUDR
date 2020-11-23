import { Type, SetMetadata } from "@nestjs/common";
import { CudrBaseEntity } from "src/cudr/CudrBase.entity";

export const SubscribeInsertCommit = (target: Type<CudrBaseEntity>) => {
  return SetMetadata('subscribeInsertCommit', target)
}