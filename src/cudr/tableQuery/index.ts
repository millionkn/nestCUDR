import { BaseEntityKlass } from "./BaseEntityKlass";
import { Type } from "@nestjs/common";
import { EntityManager, SelectQueryBuilder } from "typeorm";
import { TODOError } from "./errors";

const IDSym = Symbol();

export interface ID<T = any> {
  [IDSym]: {
    name: 'id',
    type: T,
  }
}

const hideSym = Symbol();
type Hide<need extends boolean, T> = {
  [hideSym]: need extends true ? Required<T> : Partial<T>
}

type BaseWrapper<T, isNull extends boolean, isArray extends boolean> = Hide<false, {
  wrapper: {
    type: T,
    isArray: isArray,
    isNull: isNull,
  }
}>

type Wrapper<T, isNull extends boolean, isArray extends boolean> = T extends BaseEntityKlass<any> ? {
  [key in keyof Required<T>]
  : T[key] extends Function ? never
  : T[key] extends BaseEntityKlass<any> ? Wrapper<T[key], isNull, isArray>
  : T[key] extends Array<infer X> ? Wrapper<X, isNull, true>
  : T[key] extends null | undefined | infer X ? Wrapper<X, null extends T[key] ? true : undefined extends T[key] ? true : isNull, isArray>
  : never
} : BaseWrapper<T, isNull, isArray>

type Filter<T> = null | undefined | (T extends Date ? { lessOrEqual: Date } | { moreOrEqual: Date } | { lessOrEqual: Date, moreOrEqual: Date } | {}
  : T extends number ? { lessOrEqual: number } | { moreOrEqual: number } | { lessOrEqual: number, moreOrEqual: number } | { in: T[] } | { equal: T } | {}
  : T extends string ? { like: string } | { equal: T } | { in: T[] } | {}
  : T extends boolean ? { equal: boolean } | {}
  : T extends ID ? { equal: T } | { in: T[] } | {}
  : {});

type QueryTableBody<Entity extends BaseEntityKlass<any>> = {
  [key: string]: ColumnPoint<Entity, any, boolean, boolean>
}

type TKeys<Entity extends BaseEntityKlass<any>> = {
  [key in keyof Entity]: Entity[key] extends null | undefined | infer X
  ? X extends BaseEntityKlass<any> ? never
  : X extends BaseEntityKlass<any>[] ? never
  : key
  : never
}[keyof Entity]

/**
 * Pick 可以保留是method还是property,原因未知
 */
type Simple<T> = T extends BaseEntityKlass<any> ? Pick<T, TKeys<T>> : T

type Cover<T, isNull, isArray> = isArray extends true ? Simple<T>[] : isNull extends true ? Simple<T> | null : Simple<T>

type QueryResult<Entity extends BaseEntityKlass<any>, Body1 extends QueryTableBody<Entity>> = {
  [key in keyof Body1]: Body1[key] extends ColumnPoint<Entity, infer Type, infer isNull, infer isArray> ? Cover<Type, isNull, isArray> : never
}


type ColumnPointFuns<Entity extends BaseEntityKlass<any>> = {
  ref<T, isNull extends boolean>(
    path: (entity: Wrapper<Entity, false, false>) => Wrapper<T, isNull, false>
  ): ColumnPoint<Entity, T, isNull, false> & Hide<true, {
    path: (entity: Wrapper<Entity, false, false>) => Wrapper<any, boolean, false>
  }>,
  join<E extends BaseEntityKlass<any>, Body2 extends QueryTableBody<E>>(
    extraTable: ExtraTable<E, Body2, Entity>
  ): ColumnPoint<Entity, QueryResult<E, Body2>, false, true> & {
    count(opt?: {
      column?: (body: Body2) => ColumnPoint<E, any, boolean, false> & Hide<true, {
        path: (entity: Wrapper<E, false, false>) => Wrapper<any, boolean, false>
      }>,
      distinct?: boolean,
    }): ColumnPoint<Entity, number, false, false>,
    sum(
      column: (body: Body2) => ColumnPoint<E, number, boolean, boolean>,
    ): ColumnPoint<Entity, number, false, false>,
    max(
      column: (body: Body2) => ColumnPoint<E, number, boolean, boolean>,
    ): ColumnPoint<Entity, number, false, false>,
    min(
      column: (body: Body2) => ColumnPoint<E, number, boolean, boolean>,
    ): ColumnPoint<Entity, number, false, false>,
    slice(
      skip: number,
      take: number,
    ): ColumnPoint<Entity, QueryResult<E, Body2>, false, true>
  }
}

export type ColumnPoint<Entity extends BaseEntityKlass<any>, T, isNull extends boolean, isArray extends boolean> = Hide<false, {
  columnPoint: {
    type: T,
    isNull: isNull,
    isArray: isArray,
  }
}> & Hide<true, {
  columnFactory: (aliasName: string, property: string | symbol, tqb: TableQueryBuilder<Entity>) => void
}>

type ExtraTable<Entity extends BaseEntityKlass<any>, Body3 extends QueryTableBody<Entity>, JoinTarget extends BaseEntityKlass<any>> = Hide<true, {
  extraTable: {
    Entity?: Entity,
    JoinTarget?: JoinTarget,
    body: Body3,
  }
}>

type TableTemplate<Entity extends BaseEntityKlass<any>, Body4 extends QueryTableBody<Entity>> = {
  [key in Extract<keyof Body4, string>]: (funs: ColumnPointFuns<Entity>) => Body4[key]
}

type TableBuilder<Entity extends BaseEntityKlass<any>, Body5 extends QueryTableBody<Entity>> = {
  byProperty<T, isNull extends boolean>(path: (body: Body5) => ColumnPoint<Entity, T, isNull, false>): {
    filter(filter: Filter<T>): {
      assert(value: 'notNull' | 'allowNull' | 'isNull'): TableBuilder<Entity, Body5>
    }
    sort(sortMode: 'DESC' | 'ASC' | undefined | null): {
      setNullOn(nullMode: "NULLS FIRST" | "NULLS LAST" | null | undefined): TableBuilder<Entity, Body5>
    }
  }
  query(manager: EntityManager, opts?: {
    skip?: number,
    take?: number,
  }): Promise<QueryResult<Entity, Body5>[]>;
  count(manager: EntityManager): Promise<number>;
  asExtra<E extends BaseEntityKlass<any>>(
    klass: Type<E>,
    joinPath: (e: Wrapper<Entity, false, false>) => Wrapper<E, boolean, false>,
  ): ExtraTable<Entity, Body5, E>
}

class TableQueryBuilder<Entity extends BaseEntityKlass<any>>{
  constructor(
    private manager: EntityManager,
    private klass: Type<Entity>,
  ) { }
  addPath<T, isNull extends boolean, isArray extends boolean>(
    alias: string,
    path: (wrapper: Wrapper<Entity, false, false>) => Wrapper<T, isNull, isArray>,
    cb: (output: any, value: Cover<T, isNull, isArray>) => void,
  ) {
    throw new TODOError();
  }
  addExtra<E extends BaseEntityKlass<any>, Body6 extends QueryTableBody<E>>(
    alias: string,
    extra: ExtraTable<E, Body6, Entity>,
    cb: (output: any, value: QueryResult<E, Body6>[]) => void,
  ) {
    throw new TODOError();
  }
  addSlice<E extends BaseEntityKlass<any>, Body7 extends QueryTableBody<E>>(
    alias: string,
    extra: ExtraTable<E, Body7, Entity>,
    opts: { skip: number, take: number },
    cb: (output: any, value: QueryResult<E, Body7>[]) => void,
  ): void {
    throw new TODOError();
  }
  addMax<E extends BaseEntityKlass<any>, Body8 extends QueryTableBody<E>, T, isNull extends boolean, isArray extends boolean>(
    alias: string,
    extra: ExtraTable<E, Body8, Entity>,
    path: (body: Body8) => ColumnPoint<E, T, isNull, isArray>,
    cb: (output: any, value: Cover<T, isNull, isArray>) => void,
  ) {
    throw new TODOError();
  }
  addMin<E extends BaseEntityKlass<any>, Body8 extends QueryTableBody<E>, T, isNull extends boolean, isArray extends boolean>(
    alias: string,
    extra: ExtraTable<E, Body8, Entity>,
    path: (body: Body8) => ColumnPoint<E, T, isNull, isArray>,
    cb: (output: any, value: Cover<T, isNull, isArray>) => void,
  ) {
    throw new TODOError();
  }
  addSum<E extends BaseEntityKlass<any>, Body8 extends QueryTableBody<E>, T, isNull extends boolean, isArray extends boolean>(
    alias: string,
    extra: ExtraTable<E, Body8, Entity>,
    path: (body: Body8) => ColumnPoint<E, T, isNull, isArray>,
    cb: (output: any, value: Cover<T, isNull, isArray>) => void,
  ) {
    throw new TODOError();
  }
  addCount<E extends BaseEntityKlass<any>, Body8 extends QueryTableBody<E>, T, isNull extends boolean, isArray extends boolean>(
    alias: string,
    extra: ExtraTable<E, Body8, Entity>,
    path: (body: Body8) => ColumnPoint<E, T, isNull, isArray>,
    cb: (output: any, value: Cover<T, isNull, isArray>) => void,
  ) {
    throw new TODOError();
  }
  query(opts?: {
    skip?: number,
    take?: number
  }): Promise<any[]> {
    throw new TODOError()
  }
  count(): Promise<number> {
    throw new TODOError();
  }
}

function resolveTemplate<Entity extends BaseEntityKlass<any>, Table extends QueryTableBody<Entity>>(tableTemplate: TableTemplate<Entity, Table>): Table {
  const ret: any = {};
  for (const k in tableTemplate) {
    if (tableTemplate.hasOwnProperty(k)) {
      ret[k] = tableTemplate[k]({
        ref(path) {
          return {
            [hideSym]: {
              path,
              columnFactory(alias, property, tqb) {
                tqb.addPath(alias, path, (output, value) => output[property] = value);
              },

            }
          }
        },
        join(niet) {
          const extraTable = niet;
          return {
            [hideSym]: {
              columnFactory(alias, prototype, tqb) {
                tqb.addExtra(alias, extraTable, (output, value) => output[prototype] = value)
              }
            },
            count(opt) {
              return {
                [hideSym]: {
                  columnFactory(alias, prototype, tqb) {
                    if (opt?.column) {
                      tqb.addCount(alias, extraTable, opt.column, (output, value) => output[prototype] = value)
                    } else {
                      tqb.addCount(alias, extraTable, (w) => w, (output, value) => output[prototype] = value)
                    }
                  }
                }
              }
            },
            sum(columnPath) {
              throw new TODOError();
            },
            max(columnPath) {
              throw new TODOError();
            },
            min(columnPath) {
              throw new TODOError();
            },
            slice(skip, take) {
              throw new TODOError();
            }
          }
        }
      })
    }
  };
  return ret;
}

function subTableQuery<
  Entity extends BaseEntityKlass<any>,
  TableBody extends QueryTableBody<Entity>,
  >(
    klass: Type<Entity>,
    tableBody: TableBody,
    factory: (tqb: TableQueryBuilder<Entity>) => void,
): TableBuilder<Entity, TableBody> {
  return {
    byProperty(path) {
      return {
        filter(filter) {
          return {
            assert(nullType) {
              return subTableQuery(klass, tableBody, (tqb) => {
                throw new TODOError()
              });
            }
          }
        },
        sort(sortMode) {
          return {
            setNullOn(nullMode) {
              return subTableQuery(klass, tableBody, (tqb) => {
                throw new TODOError()
              });
            }
          }
        }
      }
    },
    asExtra(path) {
      throw new TODOError()
    },
    async query(manager, opts) {
      const tableQueryBuilder = new TableQueryBuilder(manager, klass);
      Object.keys(tableBody).forEach((key, index) => {
        const element = tableBody[key][hideSym];
        element.columnFactory(`body_${index}`, key, tableQueryBuilder);
      });
      factory(tableQueryBuilder);
      return await tableQueryBuilder.query(opts);
    },
    async count(manager) {
      const tableQueryBuilder = new TableQueryBuilder(manager, klass);
      Object.keys(tableBody).forEach((key, index) => {
        const element = tableBody[key][hideSym];
        element.columnFactory(`body_${index}`, key, tableQueryBuilder);
      });
      factory(tableQueryBuilder);
      return await tableQueryBuilder.count();
    }
  }
}

export function tableQuery<
  Entity extends BaseEntityKlass<any>,
  Template extends TableTemplate<Entity, QueryTableBody<Entity>>,
  >(
    klass: Type<Entity>,
    template: Template
  ) {
  const tableBody = resolveTemplate(template);
  return subTableQuery(klass, tableBody, () => { }) as TableBuilder<Entity, { [key in keyof Template]: ReturnType<Template[key]> }>;
}