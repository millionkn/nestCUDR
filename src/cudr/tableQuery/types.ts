import { CudrBaseEntity } from "./CudrbaseEntity";
import { ID } from "@/utils/types";


const nodeSym = Symbol()
export type WrapperNode<T, isNull extends boolean, isArray extends boolean> = {
  [nodeSym]: {
    type: T,
    isNull: isNull,
    isArray: isArray,
  }
}

export type Wrapper<T, isNull extends boolean, isArray extends boolean> = WrapperNode<T, isNull, isArray> & (T extends CudrBaseEntity ? {
  [key in keyof T]
  : T[key] extends Function ? never
  : T[key] extends CudrBaseEntity ? Wrapper<T[key], isNull, isArray>
  : T[key] extends Array<infer X> ? X extends CudrBaseEntity ? Wrapper<X, isNull, true> : Wrapper<T[key], isNull, isArray>
  : T[key] extends null | infer X ? Wrapper<X, null extends T[key] ? true : isNull, isArray>
  : never
} : unknown)