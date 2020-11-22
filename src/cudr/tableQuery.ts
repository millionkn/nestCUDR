import { CudrBaseEntity } from "./CudrBase.entity";
import { Type } from "@nestjs/common";
import { ID } from "src/utils/entity";
import { UserRequirementEntity } from "src/entities";

const refSym = Symbol();

type Cover<T1, cudrNull extends boolean, cudrArray extends boolean,
  T2 = cudrArray extends true ? T1[] : T1,
  T3 = cudrNull extends true ? T2 | null : T2,
  > = T3
type Ref<T, cudrNull extends boolean, cudrArray extends boolean> = {
  [refSym]: Cover<T, cudrNull, cudrArray>
}

type Wrapper<T extends CudrBaseEntity, cudrNull extends boolean, cudrArray extends boolean> = {
  [key in keyof T]
  : T[key] extends Function ? never
  : T[key] extends CudrBaseEntity ? Wrapper<T[key], cudrNull, cudrArray>
  : T[key] extends CudrBaseEntity | null ? T[key] extends null | infer X ? X extends CudrBaseEntity ? Wrapper<X, true, cudrArray> : never : never
  : T[key] extends Array<infer X> ? X extends CudrBaseEntity ? Wrapper<X, cudrNull, true> : Ref<T[key], cudrNull, true>
  : Ref<T[key], cudrNull, cudrArray>
}

type Filter<T> = T extends ID ? { in: T[] }
  : T extends Date ? { lessOrEqual: Date } | { moreOrEqual: Date }
  : T extends number ? { lessOrEqual: number } | { moreOrEqual: number }
  : T extends string ? { like: string[] } | { like: string } | { equal: string, } | { in: string[] }
  : T extends boolean ? { equal: boolean }
  : T extends null | undefined | infer X ? X extends CudrBaseEntity ? { in: X['id'][] } : never
  : never
const loadSym = Symbol();
interface loadAble<T, cudrNull extends boolean, cudrArray extends boolean> {
  [loadSym]: Cover<T, cudrNull, cudrArray>;
}
type WrapperInput<E extends CudrBaseEntity> = Wrapper<E, false, false>

interface QueryFuns<E extends CudrBaseEntity> {
  path<T, array extends boolean>(
    path: (entity: WrapperInput<E>) => T extends CudrBaseEntity ? Wrapper<T, false, array> : Ref<T, false, array>,
  ): loadAble<T, false, array>
  path<T, array extends boolean, ET extends T>(
    path: (entity: WrapperInput<E>) => T extends CudrBaseEntity ? Wrapper<T, true, array> : Ref<T, true, array>,
    defaultValue: ET | null,
  ): loadAble<T, false, array>
  count(
    path: (entity: WrapperInput<E>) => Wrapper<CudrBaseEntity, false, true> | Ref<string, false, true> | Ref<ID, false, true>,
  ): loadAble<number, false, false>
  count<T, ET extends T>(
    path: (entity: WrapperInput<E>) => T extends CudrBaseEntity ? Wrapper<T, true, true> : Ref<T, true, true>,
    defaultValue: ET | null,
  ): loadAble<number, false, false>
  max(
    path: (entity: WrapperInput<E>) => Ref<number, any, true>,
  ): loadAble<number, false, false>
  min(
    path: (entity: WrapperInput<E>) => Ref<number, any, true>,
  ): loadAble<number, false, false>
  arv(
    path: (entity: WrapperInput<E>) => Ref<number, any, true>,
  ): loadAble<number, false, false>
}

type TableQueryBodyOption<E extends CudrBaseEntity> = {
  [key: string]: (funs: QueryFuns<E>) => loadAble<any, false, any>
}

type TableQueryBodyInput<B extends TableQueryBodyOption<any>> = {
  [key in keyof B]: ReturnType<B[key]>
}
type Simple<T extends CudrBaseEntity> = {
  [key in {
    [key in keyof T]: T[key] extends null | undefined | infer X ?
    X extends CudrBaseEntity ? never : key
    : never
  }[keyof T]]: T[key]
}
type QueryResult<B extends TableQueryBodyOption<any>> = {
  [key in keyof B]: ReturnType<B[key]> extends loadAble<infer T, infer isNull, infer isArray> ?
  T extends CudrBaseEntity ? isArray extends true ? Array<Simple<T> | (isNull extends true ? null : never)> : (Simple<T> | (isNull extends true ? null : never)) : Cover<T, isNull, isArray>
  : never
}
interface TableQueryBuilder<B extends TableQueryBodyOption<any>> {
  filter: <T extends loadAble<any, false, false>>(
    path: (body: TableQueryBodyInput<B>) => T,
    filter: T extends loadAble<infer X, false, false> ? Filter<X> : never,
  ) => this
  filterArray: <T extends loadAble<any, false, true>>(
    path: (body: TableQueryBodyInput<B>) => T,
    filter: T extends loadAble<infer X, false, true> ? Filter<X> : never,
    allowEmpty?: boolean | undefined,
  ) => this
  sort: (path: (body: TableQueryBodyInput<B>) => loadAble<any, any, true>, mode: -1 | 0 | 1) => this
  query: (page?: {
    pageIndex: number,
    pageSize: number,
  }) => Promise<QueryResult<B>[]>
}

export function tableQuery<E extends CudrBaseEntity, B extends TableQueryBodyOption<E>>(klass: Type<E>, body: B): TableQueryBuilder<B> {
  throw new Error();
}


const x = tableQuery(UserRequirementEntity, {
  username: ({ path }) => path((e) => e.lastLog),
})
  .filter((r) => r.username, { in: [] })
  .query().then((arr) => {
    arr[0].username
  })
