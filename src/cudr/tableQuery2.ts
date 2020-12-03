import { CudrBaseEntity } from "./CudrBase.entity";
import { Type } from "@nestjs/common";
import { ID } from "src/utils/entity";
import { EntityManager } from "typeorm";
import { UserRequirementEntity } from "src/entities";

const typeSym = Symbol();
const isArraySym = Symbol();
const isNullSym = Symbol();

type Cover<T1, cudrNull extends boolean, cudrArray extends boolean,
  T2 = cudrNull extends true ? T1 | null : T1,
  T3 = cudrArray extends true ? T2[] : T2,
  > = T3
interface WrapperType<T, cudrNull extends boolean, cudrArray extends boolean> {
  [typeSym]: T,
  [isArraySym]: cudrArray,
  [isNullSym]: cudrNull,
}

type Wrapper<T extends CudrBaseEntity, cudrNull extends boolean, cudrArray extends boolean> = {
  [key in keyof T]
  : T[key] extends Function ? never
  : T[key] extends CudrBaseEntity ? Wrapper<T[key], cudrNull, cudrArray>
  : T[key] extends CudrBaseEntity | null | undefined ? Exclude<T[key], null | undefined> extends CudrBaseEntity ? Wrapper<Exclude<T[key], null | undefined>, true, cudrArray> : never
  : T[key] extends Array<infer X> ? X extends CudrBaseEntity ? Wrapper<X, cudrNull, true> : WrapperType<X, cudrNull, true>
  : WrapperType<T[key], cudrNull, cudrArray>
}

type Filter<T> = T extends ID ? { in: T[] }
  : T extends Date ? { lessOrEqual: Date } | { moreOrEqual: Date } | { lessOrEqual: Date, moreOrEqual: Date }
  : T extends number ? { lessOrEqual: number } | { moreOrEqual: number } | { lessOrEqual: number, moreOrEqual: number }
  : T extends string ? { like: string[] } | { like: string } | { equal: string, } | { in: string[] }
  : T extends boolean ? { equal: boolean }
  : T extends CudrBaseEntity ? { in: T['id'][] }
  : never;

const refSym = Symbol();
interface RefPath<input, output> {
  [refSym]: (input: input) => output,
}

const columnSym = Symbol();
interface Column<T, cudrNull extends boolean, cudrArray extends boolean> {
  [columnSym]: WrapperType<T, cudrNull, cudrArray>
}


export function RefPath<input, output>(pathFun: (input: input) => output): RefPath<input, output> {
  return {
    [refSym]: pathFun,
  };
}


interface QueryFuns<E extends CudrBaseEntity> {
  ref<T>(
    path: RefPath<Wrapper<E, false, false>, T extends CudrBaseEntity ? Wrapper<T, false, false> : WrapperType<T, false, false>>
  ): Column<T, false, false>
  ref<T, V extends T>(
    path: RefPath<Wrapper<E, false, false>, T extends CudrBaseEntity ? Wrapper<T, true, false> : WrapperType<T, true, false>>,
    nullValue: V,
  ): Column<T, false, false>
  ref<T>(
    path: RefPath<Wrapper<E, false, false>, T extends CudrBaseEntity ? Wrapper<T, boolean, true> : WrapperType<T, boolean, true>>
  ): Column<T, false, true>
}

type TableQueryBody<E extends CudrBaseEntity<any>> = {
  [key: string]: (funs: QueryFuns<E>) => Column<any, any, any>
}
type QueryResultColumns<T extends TableQueryBody<any>> = {
  [key in keyof T]: ReturnType<T[key]>
}
export type Simple<T extends CudrBaseEntity> = {
  [key in {
    [key in keyof T]: T[key] extends null | undefined | infer X
    ? X extends CudrBaseEntity ? never
    : X extends CudrBaseEntity[] ? never
    : key
    : never
  }[keyof T]]: T[key]
}
type QueryResult<B extends TableQueryBody<any>> = {
  [key in keyof B]: ReturnType<B[key]> extends Column<infer T, infer isNull, infer isArray> ?
  T extends CudrBaseEntity ? Cover<Simple<T>, isNull, isArray> : Cover<T, isNull, isArray>
  : never
}

interface TableQueryBuilder<B extends TableQueryBody<any>> {
  filter<T>(
    path: RefPath<QueryResultColumns<B>, Column<T, false, false>>,
    filter: Filter<T>,
  ): this;
  filter(
    path: RefPath<QueryResultColumns<B>, Column<any, false, true>>,
    mode: 'isEmpty' | 'notEmpty' | undefined | null,
  ): this;
  sort(path: RefPath<QueryResultColumns<B>, Column<any, false, false>>, mode: 'desc' | 'asc' | undefined | null): this
  query(opts?: {
    manager?: EntityManager,
    page?: {
      index: number,
      size: number,
    }
  }): Promise<QueryResult<B>[]>;
}

export function tableQuery<E extends CudrBaseEntity, B extends TableQueryBody<E>>(klass: Type<E>, body: B): TableQueryBuilder<B> {
  throw new Error();
}
tableQuery(UserRequirementEntity, {
  id: ({ ref }) => ref(RefPath((e) => e.id)),
  userEntity: ({ ref }) => ref(RefPath((e) => e.user), {} as any),
  requirementsArray: ({ join }) => join(RefPath((e: any) => e.user.requirements), {

  }),
  username: ({ ref }) => ref(RefPath(e => e.user.name), ''),
})
  .filter(RefPath(e => e.userEntity), { in: [] })
  .filter(RefPath((e) => e.requirementsArray), 'notEmpty')
  .query()
  .then(([result]) => {
    const r1: number = result.userEntity.num23;
    const r2: UserRequirementEntity['id'] = result.id;
    const r3: string = result.username;
    const r4: string[] = result.requirementsArray;
  })
