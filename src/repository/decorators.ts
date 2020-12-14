import { Type, SetMetadata } from "@nestjs/common";
import { CudrBaseEntity } from "@/cudr/CudrBase.entity";

export const SubscribeInsertCommit = (target: Type<CudrBaseEntity>) => {
  return SetMetadata('subscribeInsertCommit', target)
}