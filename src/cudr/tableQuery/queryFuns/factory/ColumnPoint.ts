import { CudrBaseEntity } from "../../CudrbaseEntity";
import { Type } from "@nestjs/common";

const ColumnPointSym = Symbol();
export type ColumnPoint<Entity extends CudrBaseEntity, T> = {
  [ColumnPointSym]: (klass: Type<Entity>) => (raws: any[]) => (id: Entity['id']) => T
}
export function ColumnPoint<Entity extends CudrBaseEntity, T>(fun: (klass: Type<Entity>) => (raws: any[]) => (id: Entity['id']) => T): ColumnPoint<Entity, T> {
  return { [ColumnPointSym]: fun }
}