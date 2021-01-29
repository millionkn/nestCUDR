import { BaseEntityKlass } from "./BaseEntityKlass";
import { ID } from "@/utils/id";
import { ColumnPoint } from "./ColumnPoint";

const dataSym = Symbol();
export type NoInterface<T> = {
  [dataSym]: T
}
export function NoInterface<T>(data: T): NoInterface<T> {
  return {
    [dataSym]: data,
  }
}
export type UnpackInterface<T extends NoInterface<any>> = T[typeof dataSym]
export function UnpackInterface<T>(target: NoInterface<T>): T {
  return target[dataSym];
}

type BaseWrapper<T, isNull extends boolean, isArray extends boolean> = NoInterface<{
  type: T,
  isArray: isArray,
  isNull: isNull,
}>

export type Wrapper<T, isNull extends boolean, isArray extends boolean> = T extends BaseEntityKlass ? {
  [key in keyof T]
  : T[key] extends Function ? never
  : T[key] extends BaseEntityKlass ? Wrapper<T[key], isNull, isArray>
  : T[key] extends Array<infer X> ? Wrapper<X, isNull, true>
  : T[key] extends null | undefined | infer X ? Wrapper<X, true, isArray>
  : BaseWrapper<T[key], isNull, isArray>
} : BaseWrapper<T, isNull, isArray>

export type Filter<T> = null | undefined | (T extends Date ? { lessOrEqual: Date } | { moreOrEqual: Date } | { lessOrEqual: Date, moreOrEqual: Date } | {}
  : T extends number ? { lessOrEqual: number } | { moreOrEqual: number } | { lessOrEqual: number, moreOrEqual: number } | { in: T[] } | { equal: T } | {}
  : T extends string ? { like: string } | { equal: T } | { in: T[] } | {}
  : T extends boolean ? { equal: boolean } | {}
  : T extends ID ? { equal: T } | { in: T[] } | {}
  : {});

export type QueryTable = {
  [key: string]: NoInterface<ColumnPoint<any, boolean, boolean>>
}

type TKeys<Entity extends BaseEntityKlass> = {
  [key in keyof Entity]: Entity[key] extends null | undefined | infer X
  ? X extends BaseEntityKlass ? never
  : X extends BaseEntityKlass[] ? never
  : key
  : never
}[keyof Entity]

/**
 * Pick 可以保留是method还是property,原因未知
 */
type Simple<T> = T extends BaseEntityKlass ? Pick<T, TKeys<T>> : T

export type Cover<T, isNull, isArray> = isArray extends true ? Simple<T>[] : isNull extends true ? Simple<T> | null : Simple<T>

export type QueryResult<Body extends QueryTable> = {
  [key in keyof Body]: Body[key] extends NoInterface<ColumnPoint<infer Type, infer isNull, infer isArray>> ? Cover<Type, isNull, isArray> : never
}