import { CudrBaseEntity } from "./CudrBase.entity";
import { Type } from "@nestjs/common";
import { ID } from "src/utils/entity";
import { UserRequirementEntity } from "src/entities";

const sym = Symbol();

type Ref<T, isCudrArr extends boolean> = { [sym]: isCudrArr extends true ? T[] : T }

type Wrapper<T extends CudrBaseEntity, isCudrArr extends boolean> = {
  [key in keyof T]
  : T[key] extends Function ? never
  : T[key] extends CudrBaseEntity ? Wrapper<T[key], isCudrArr>
  : T[key] extends Array<infer X> ? X extends CudrBaseEntity ? Wrapper<X, true> : Ref<T[key], false>
  : Ref<T[key], isCudrArr>
}

type Filter<T> = T extends ID ? { in: T[] }
  : T extends Date ? { lessOrEqual?: string, moreOrEqual?: string }
  : T extends number ? { lessOrEqual?: number, moreOrEqual?: number }
  : T extends string ? { like: string[] } | { like: string } | { equal: string, } | { in: string[] }
  : T extends boolean ? { equal: boolean }
  : never


interface loadAble<T> {
  [sym]: T
}
interface RefHandler<T> extends loadAble<T> {
  filter(filter: Filter<T>): this;
  sortIndex(num: number): this;
  isNull(value: true): loadAble<null>;
  isNull(value: false): RefHandler<T extends null | infer X ? X : T>;
}
interface WrapperHandler<T extends CudrBaseEntity> extends loadAble<T> {
  isNull(value: true): loadAble<null>;
  isNull(value: false): WrapperHandler<T extends null | infer X ? X : T>;
}
interface ArrHandler<T> extends loadAble<T> {
  isEmpty(value: boolean): loadAble<T[]>;
}
interface RefArrHandler<T> extends loadAble<T[]> {
  filter(filter: Filter<T>): this;
  sortIndex(num: number): this;
  isNull(value: true): loadAble<null>;
  isNull(value: false): RefArrHandler<T extends null | infer X ? X : T>;
  asArray(): ArrHandler<T>
}
interface WrapperArrHandler<T extends CudrBaseEntity> extends loadAble<T[]> {
  isNull(value: true): loadAble<null>;
  isNull(value: false): WrapperArrHandler<T extends null | infer X ? X : T>;
  asArray(): ArrHandler<T>
}

type TableQueryBody<E extends CudrBaseEntity> = {
  [key: string]: (funs: {
    ref: <T, isCudrArr extends boolean>(path: (entity: Wrapper<E, false>) => T extends CudrBaseEntity ? Wrapper<T, isCudrArr> : Ref<T, isCudrArr>) =>
      T extends CudrBaseEntity ?
      isCudrArr extends true ? WrapperArrHandler<T> : WrapperHandler<T> :
      isCudrArr extends true ? RefArrHandler<T> : RefHandler<T>,
    count: (path: (entity: Wrapper<E, false>) => Wrapper<CudrBaseEntity, true> | Ref<string, true> | Ref<ID, true>) => RefHandler<number>,
    sum: (path: (entity: Wrapper<E, false>) => Ref<number, true>) => RefHandler<number>,
    max: (path: (entity: Wrapper<E, false>) => Ref<number, true>) => RefHandler<number>,
    min: (path: (entity: Wrapper<E, false>) => Ref<number, true>) => RefHandler<number>,
    arv: (path: (entity: Wrapper<E, false>) => Ref<number, true>) => RefHandler<number>,
  }) => loadAble<any>
}


export function tableQuery<E extends CudrBaseEntity, T extends TableQueryBody<E>>(klass: Type<E>, body: T): {
  [key in keyof T]: ReturnType<T[key]> extends loadAble<infer X> ? X : never
} {
  throw new Error();
}

tableQuery(UserRequirementEntity, {
  username: ({ ref }) => ref((e) => e.user.requirements.user.name).isNull(false).filter({ like: '' }).asArray().isEmpty(false)
}).username
