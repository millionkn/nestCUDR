import { ColumnPoint } from "./ColumnPoint";
import { EntityManager } from "typeorm";
import { BaseEntityKlass } from "./BaseEntityKlass";
import { Wrapper, Filter, QueryTable, QueryResult, NoInterface } from "./types";
import { ExtraTable } from "./ExtraTable";

export type QueryTableBuilder<Entity extends BaseEntityKlass, Table extends QueryTable> = {
  byProperty<T, isNull extends boolean>(path: (body: Table) => NoInterface<ColumnPoint<T, isNull, false>>): {
    filter(filter: Filter<T>): {
      assert(value: 'notNull' | 'allowNull' | 'isNull'): QueryTableBuilder<Entity, Table>
    }
    sort(sortMode: 'DESC' | 'ASC' | undefined | null): {
      setNullOn(nullMode: "NULLS FIRST" | "NULLS LAST" | null | undefined): QueryTableBuilder<Entity, Table>
    }
  }
  query(manager: EntityManager, opts?: {
    skip?: number,
    take?: number,
  }): Promise<QueryResult<Table>[]>;
  count(manager: EntityManager): Promise<number>;
  asExtra<T extends BaseEntityKlass>(
    joinPath: (e: Wrapper<Entity, false, false>) => Wrapper<T, boolean, false>,
  ): NoInterface<ExtraTable<Table, T>>
}