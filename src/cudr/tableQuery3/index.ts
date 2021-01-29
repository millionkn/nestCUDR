import { BaseEntityKlass } from "./BaseEntityKlass";
import { Type } from "@nestjs/common";
import { QueryTableBuilder } from "./QuerytableBuilder";
import { QueryTable, Wrapper, QueryResult, NoInterface, UnpackInterface } from "./types";
import { ColumnPoint } from "./ColumnPoint";
import { ExtraTable } from "./ExtraTable";
import { objectMap } from "@/utils/objectMap";

export type ColumnPointFuns<Entity extends BaseEntityKlass> = {
  ref<T, isNull extends boolean>(
    path: (entity: Wrapper<Entity, false, false>) => Wrapper<T, isNull, false>
  ): NoInterface<ColumnPoint<T, isNull, false>>
  join<Body extends QueryTable>(
    extraTable: NoInterface<ExtraTable<Body, Entity>>
  ): NoInterface<ColumnPoint<QueryResult<Body>, false, true>> & {
    count(): NoInterface<ColumnPoint<number, false, false>>
    countOn<T>(
      path: (body: QueryTable) => NoInterface<ColumnPoint<T, boolean, boolean>>,
    ): NoInterface<ColumnPoint<number, false, false>>
    sum(
      path: (body: QueryTable) => NoInterface<ColumnPoint<number, boolean, false>>,
    ): NoInterface<ColumnPoint<number, false, false>>
    max(
      path: (body: QueryTable) => NoInterface<ColumnPoint<number, boolean, false>>,
    ): NoInterface<ColumnPoint<number, false, false>>
    min(
      path: (body: QueryTable) => NoInterface<ColumnPoint<number, boolean, false>>,
    ): NoInterface<ColumnPoint<number, false, false>>
    slice(
      skip: number,
      take: number,
    ): NoInterface<ColumnPoint<QueryResult<Body>, false, true>>
  }
}

export type TableTemplate<Entity extends BaseEntityKlass, Table extends QueryTable> = {
  [key in keyof Table]: (funs: ColumnPointFuns<Entity>) => Table[key]
}

export function tableQuery<Entity extends BaseEntityKlass, Table extends QueryTable>(klass: Type<Entity>, tableTemplate: TableTemplate<Entity, Table>): QueryTableBuilder<Entity, Table> {
  const queryBody = objectMap(tableTemplate, (v) => v({
    ref(path) {
      throw new Error();
    },
    join(niet) {
      const extraTable = UnpackInterface(niet);
      throw new Error();
    }
  }))

  return {
    byProperty() {
      throw new Error();
    },
    asExtra(path) {
      throw new Error();
    },
    query() {
      throw new Error();
    },
    count() {
      throw new Error();
    }
  }
}