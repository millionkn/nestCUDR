import { ColumnPoint } from "./factory/ColumnPoint";
import { CudrBaseEntity } from "../CudrbaseEntity";
import { Wrapper, WrapperNode } from "../types";

export const ref = <Entity extends CudrBaseEntity, T, isNull extends boolean, isArray extends boolean>(
  fun: (e: Wrapper<Entity, false, false>) => WrapperNode<T, isNull, isArray>
): ColumnPoint<Entity, isArray extends true ? T[] : isNull extends true ? T | null : T> => {
  return ColumnPoint((klass) => {
    return (mappedRaws) => (id) => {
      const target = mappedRaws.find((raw) => raw.id === id);
      if (!target) { throw new Error(); }
      return target;
    }
  })
}