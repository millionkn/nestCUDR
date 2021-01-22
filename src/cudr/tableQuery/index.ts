import { BaseEntityKlass } from "./BaseEntityKlass";
import { Type } from "@nestjs/common";
import { TableQueryBuilder, QueryResult } from "./TableQueryBuilder";
import { TableQueryBody, Wrapper } from "./types";
import { ColumnPoint } from "./ColumnPoint";
import { ExtraTableQuery } from "./ExtraTableQuery";

export type ColumnPointFuns<Entity extends BaseEntityKlass> = {
  ref<T, isNull extends boolean, isArray extends boolean>(
    path: (entity: Wrapper<Entity, false, false>) => Wrapper<T, isNull, isArray>
  ): ColumnPoint<T, isNull, isArray>
  join<E extends BaseEntityKlass, Body extends TableQueryBody>(
    extraQuery: ExtraTableQuery<E, Body, Entity>
  ): ColumnPoint<QueryResult<Body>, false, true> & {
    count(): ColumnPoint<number, false, false>
    countOn<T>(
      path: (body: TableQueryBody) => ColumnPoint<T, boolean, boolean>,
    ): ColumnPoint<number, false, false>
    sum(
      path: (body: TableQueryBody) => ColumnPoint<number, boolean, false>,
    ): ColumnPoint<number, false, false>
    max(
      path: (body: TableQueryBody) => ColumnPoint<number, boolean, false>,
    ): ColumnPoint<number, false, false>
    min(
      path: (body: TableQueryBody) => ColumnPoint<number, boolean, false>,
    ): ColumnPoint<number, false, false>
    slice(
      skip: number,
      take: number,
    ): ColumnPoint<QueryResult<Body>, false, true>
  }
}

export type TableQueryTemplate<Entity extends BaseEntityKlass, Body extends TableQueryBody> = {
  [key in keyof Body]: (funs: ColumnPointFuns<Entity>) => Body[key]
}

export function tableQuery<E extends BaseEntityKlass, Body extends TableQueryBody>(klass: Type<E>, queryBody: TableQueryTemplate<E, Body>): TableQueryBuilder<E, Body> {
  throw new Error();
}