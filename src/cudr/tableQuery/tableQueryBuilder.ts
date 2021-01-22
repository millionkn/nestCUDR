import { ColumnPoint } from "./ColumnPoint";
import { EntityManager } from "typeorm";
import { BaseEntityKlass } from "./BaseEntityKlass";
import { Wrapper, Filter, TableQueryBody, Cover } from "./types";
import { ExtraTableQuery } from "./ExtraTableQuery";

export type QueryResult<Body extends TableQueryBody> = {
  [key in keyof Body]: Body[key] extends ColumnPoint<infer Type, infer isNull, infer isArray> ? Cover<Type, isNull, isArray> : never
}

export type TableQueryBuilder<Entity extends BaseEntityKlass, Body extends TableQueryBody> = {
  byProperty<T, isNull extends boolean>(path: (body: Body) => ColumnPoint<T, isNull, false>): {
    filter(filter: Filter<T>): {
      assert(value: 'notNull' | 'allowNull' | 'isNull'): TableQueryBuilder<Entity, Body>
    }
    sort(sortMode: 'DESC' | 'ASC' | undefined | null): {
      setNullOn(nullMode: "NULLS FIRST" | "NULLS LAST" | null | undefined): TableQueryBuilder<Entity, Body>
    }
  }
  byArray<T>(path: (body: Body) => ColumnPoint<T, boolean, true>): {
    filter(mode: 'isEmpty' | 'notEmpty' | undefined | null): TableQueryBuilder<Entity, Body>
  }
  query(manager: EntityManager, opts?: {
    skip?: number,
    take?: number,
  }): Promise<QueryResult<Body>[]>;
  count(manager: EntityManager): Promise<number>;
  asExtraQuery<T extends BaseEntityKlass>(
    joinPath: (e: Wrapper<Entity, false, false>) => Wrapper<T, boolean, false>,
  ): ExtraTableQuery<Entity, Body, T>
}