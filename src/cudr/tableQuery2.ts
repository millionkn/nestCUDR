import { CudrBaseEntity } from "./CudrBase.entity";
import { Type } from "@nestjs/common";
import { ID } from "@/utils/entity";
import { EntityManager, getManager } from "typeorm";
import { UserRequirementEntity, UserEntity } from "@/entities";
import { getPathStrArray } from "@/utils/getPathStrArray";

const infoSym = Symbol();
type WithInfo<T extends object, I> = T & { [infoSym]: I }

const typeSym = Symbol();
const isArraySym = Symbol();
const isNullSym = Symbol();

type Cover<T1, cudrNull extends boolean, cudrArray extends boolean,
  T2 = cudrNull extends true ? T1 | null : T1,
  T3 = cudrArray extends true ? T1[] : T2,
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

const columnSym = Symbol();
interface Column<T, cudrNull extends boolean, cudrArray extends boolean> {
  [columnSym]: WrapperType<T, cudrNull, cudrArray>
}

interface JoinWhat<B extends TableQueryBody<any>> {
  count(): Column<number, false, false>
  count(path: (resultColumns: QueryResultColumns<B>) => Column<any, false, false>): Column<number, false, false>
  sum(path: (resultColumns: QueryResultColumns<B>) => Column<number, false, false>): Column<number, false, false>
}

interface QueryFuns<E extends CudrBaseEntity> {
  ref<T>(
    path: (entity: Wrapper<E, false, false>) => T extends CudrBaseEntity ? Wrapper<T, false, false> : WrapperType<T, false, false>
  ): Column<T, false, false>
  ref<T>(
    path: (entity: Wrapper<E, false, false>) => T extends CudrBaseEntity ? Wrapper<T, true, false> : WrapperType<T, true, false>,
  ): {
    setNullAs(nullValue: T): Column<T, false, false>
  }
  join<T extends CudrBaseEntity, B extends TableQueryBody<T>>(
    subQuery: SubTableQuery<T, B, E>
  ): JoinWhat<B> & Column<QueryResult<B>, false, true>
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

const SubTableQueryKlassSym = Symbol();
const SubTableQueryBodySym = Symbol();
const SubTableQueryOutTypeSym = Symbol();

type SubTableQuery<E extends CudrBaseEntity, B extends TableQueryBody<E>, O extends CudrBaseEntity> = {
  [SubTableQueryKlassSym]: E
  [SubTableQueryBodySym]: B
  [SubTableQueryOutTypeSym]: O
}

interface TableQueryBuilder<E extends CudrBaseEntity, B extends TableQueryBody<E>> {
  column<T>(path: (resultColumns: QueryResultColumns<B>) => Column<T, false, false>): {
    filter(filter: Filter<T>): TableQueryBuilder<E, B>
    sort(mode: 'desc' | 'asc' | undefined | null): TableQueryBuilder<E, B>
  }
  column<T>(path: (resultColumns: QueryResultColumns<B>) => Column<T, false, true>): {
    filter: (mode: 'isEmpty' | 'notEmpty' | undefined | null) => TableQueryBuilder<E, B>
  }
  query(manager: EntityManager, opts?: {
    skip?: number,
    take?: number,
  }): Promise<QueryResult<B>[]>;
  asSubQuery<T extends CudrBaseEntity>(joinPath: (e: Wrapper<E, false, false>) => Wrapper<T, any, false>): SubTableQuery<E, B, T>
}

function tableQueryMutable<E extends CudrBaseEntity, B extends TableQueryBody<E>>(klass: Type<E>, body: B) {
  const object: TableQueryBuilder<E, B> = {
    column<T>(pathFun: (resultColumns: QueryResultColumns<B>) => Column<T, false, boolean>) {
      const pathStrArray = getPathStrArray(pathFun);
      return {
        filter(filter: Filter<T> | 'isEmpty' | 'notEmpty' | undefined | null) {
          return object;
        },
        sort(mode: 'desc' | 'asc' | undefined | null) {
          return object;
        }
      }
    },
    asSubQuery(): any {
    },
    async query(manager, opt): Promise<any> {

    },
  }
  return object;
}

const r1 = tableQueryMutable(UserRequirementEntity, {
  num: ({ ref }) => ref(e => e.test)
}).column((e) => e.num).filter({ lessOrEqual: 1 }).asSubQuery((e) => e.user);

const r2 = tableQueryMutable(UserEntity, {
  id: ({ ref }) => ref((e) => e.id),
  userEntity: ({ ref }) => ref((e) => e),
  requirementsArrayCount: ({ join }) => join(r1).count(),
  requirementsTestSum: ({ join }) => join(r1).sum(e => e.num),
  name: ({ ref }) => ref(e => e.name),
})
  .column((e) => e.userEntity).filter({ in: [] })
  .column((e) => e.requirementsArrayCount).filter({ moreOrEqual: 1 })
  .column((e) => e.name).sort('desc')


