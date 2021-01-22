import { ID } from "@/utils/id";
import { CudrBaseEntity } from "../CudrBaseEntity";
import { SubTableQuery } from "./subTableQuery";
import { EntityManager } from "typeorm";
import { ColumnPoint } from "./queryFuns";

type Cover<T1, cudrNull extends boolean, cudrArray extends boolean,
  T2 = cudrNull extends true ? T1 | null : T1,
  T3 = cudrArray extends true ? T1[] : T2,
  > = T3

const WrapperPointSym = Symbol()
type WrapperPoint<T, cudrNull extends boolean, cudrArray extends boolean> = {
  [WrapperPointSym]: {
    type: T,
    isArray: cudrArray,
    isNull: cudrNull,
  }
}

const BaseWrapperSym = Symbol();
interface BaseWrapper<T, cudrNull extends boolean, cudrArray extends boolean> {
  [BaseWrapperSym]: {
    type: T,
    isArray: cudrArray,
    isNull: cudrNull,
  },
}

type EntityWrapper<T extends CudrBaseEntity, cudrNull extends boolean, cudrArray extends boolean> = {
  [key in keyof T]
  : T[key] extends Function ? never
  : T[key] extends CudrBaseEntity ? Wrapper<T[key], cudrNull, cudrArray>
  : T[key] extends Array<infer X> ? Wrapper<X, cudrNull, true>
  : T[key] extends null | undefined | infer X ? Wrapper<X, true, cudrArray>
  : BaseWrapper<T[key], cudrNull, cudrArray>
}

type Wrapper<T, cudrNull extends boolean, cudrArray extends boolean> = WrapperPoint<T, cudrNull, cudrArray> & (T extends CudrBaseEntity ? EntityWrapper<T, cudrNull, cudrArray> : BaseWrapper<T, cudrNull, cudrArray>);

export type Filter<T> = null | undefined | (T extends Date ? { lessOrEqual: Date } | { moreOrEqual: Date } | { lessOrEqual: Date, moreOrEqual: Date } | {}
  : T extends number ? { lessOrEqual: number } | { moreOrEqual: number } | { lessOrEqual: number, moreOrEqual: number } | { in: T[] } | { equal: T } | {}
  : T extends string ? { like: string } | { equal: T } | { in: T[] } | {}
  : T extends boolean ? { equal: boolean } | {}
  : T extends ID ? { equal: T } | { in: T[] } | {}
  : {});

export type ColumnPointBody<Body extends TableQueryBody<any>> = {
  [key in Extract<keyof Body, string>]: ColumnPoint<any, boolean, boolean>;
}

export interface QueryFuns<Entity extends CudrBaseEntity> {
  ref<T, isNull extends boolean, isArray extends boolean>(
    path: (entity: Wrapper<Entity, false, false>) => WrapperPoint<T, isNull, isArray>
  ): ColumnPoint<T, isNull, isArray>
  join<E extends CudrBaseEntity, Body extends TableQueryBody<E>>(
    subQuery: SubTableQuery<E, Body, Entity>
  ): ColumnPoint<QueryResult<Body>, false, true> & {
    count(): ColumnPoint<number, false, false>
    countOn<T>(
      path: (body: ColumnPointBody<Body>) => ColumnPoint<T, boolean, boolean>,
    ): ColumnPoint<number, false, false>
    sum(
      path: (body: ColumnPointBody<Body>) => ColumnPoint<number, boolean, false>,
    ): ColumnPoint<number, false, false>
    max(
      path: (body: ColumnPointBody<Body>) => ColumnPoint<number, boolean, false>,
    ): ColumnPoint<number, false, false>
    min(
      path: (body: ColumnPointBody<Body>) => ColumnPoint<number, boolean, false>,
    ): ColumnPoint<number, false, false>
    slice(
      skip: number,
      take: number,
    ): ColumnPoint<QueryResult<Body>, false, true>
  }
}

export type TableQueryBody<Entity extends CudrBaseEntity<any>> = {
  [key: string]: (funs: QueryFuns<Entity>) => ColumnPoint<any, boolean, boolean>
}

export type Simple<Entity extends CudrBaseEntity> = {
  [key in {
    [key in keyof Entity]: Entity[key] extends null | undefined | infer X
    ? X extends CudrBaseEntity ? never
    : X extends CudrBaseEntity[] ? never
    : key
    : never
  }[keyof Entity]]: Entity[key]
}

export interface TableQueryBuilder<Entity extends CudrBaseEntity, Body extends TableQueryBody<Entity>> {
  byProperty<T, isNull extends boolean>(path: (body: ColumnPointBody<Body>) => ColumnPoint<T, isNull, false>): {
    filter(filter: Filter<T> | null | undefined): {
      assert(value: 'notNull' | 'allowNull' | 'isNull'): TableQueryBuilder<Entity, Body>
    }
    sort(sortMode: 'DESC' | 'ASC' | undefined | null): {
      setNullOn(nullMode: "NULLS FIRST" | "NULLS LAST" | null | undefined): TableQueryBuilder<Entity, Body>
    }
  }
  byArray<T>(path: (body: ColumnPointBody<Body>) => ColumnPoint<T, boolean, true>): {
    filter(mode: 'isEmpty' | 'notEmpty' | undefined | null): TableQueryBuilder<Entity, Body>
  }
  query(manager: EntityManager, opts?: {
    skip?: number,
    take?: number,
  }): Promise<QueryResult<Body>[]>;
  count(manager: EntityManager): Promise<number>;
  asSubQuery<T extends CudrBaseEntity>(
    joinPath: (e: Wrapper<Entity, false, false>) => Wrapper<T, boolean, false>,
  ): SubTableQuery<Entity, Body, T>
}
type QueryResult<Body extends TableQueryBody<any>> = {
  [key in keyof Body]: ReturnType<Body[key]> extends ColumnPoint<infer T, infer isNull, infer isArray> ?
  T extends CudrBaseEntity ? Cover<Simple<T>, isNull, isArray> : Cover<T, isNull, isArray>
  : never
}

export interface QueryTools<Entity extends CudrBaseEntity> {
  addColumn(path: (entity: Wrapper<Entity, false, false>) => WrapperPoint<any, boolean, boolean>): void;
}