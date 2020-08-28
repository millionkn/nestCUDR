import { Type } from "@nestjs/common"
import { CudrBaseEntity } from "./CudrBase.entity"
import { OneToOne } from "typeorm";
import { loadKeyOfTypeFun } from "src/utils";

export function isOneToLastOne(prototype: any, key: string): string | null {
  if (!Reflect.hasMetadata(OneToLastOne, prototype, key)) { return null; }
  const otherSide = Reflect.getMetadata(OneToLastOne, prototype, key);
  return loadKeyOfTypeFun(otherSide);
}

export function OneToLastOne<T extends CudrBaseEntity<any>>(
  klassFun: () => Type<T>,
  otherSide: (obj: T) => any,
) {
  return (prototype: any, key: string) => {
    Reflect.defineMetadata(`design:typeFun`, klassFun, prototype, key);
    OneToOne(klassFun)(prototype, key);
    Reflect.defineMetadata(OneToLastOne, otherSide, prototype, key);
  }
}