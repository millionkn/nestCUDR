import { BaseEntityKlass } from "./BaseEntityKlass";
import { Type } from "@nestjs/common";
import { EntityManager, SelectQueryBuilder, getMetadataArgsStorage } from "typeorm";
import { NoPropertyError, PathResolveError, EmptyArrayError, TODOError } from "./errors";
import { isNullOrUndefined } from "util";
import { getPathStrArray } from "@/utils/getPathStrArray";

const IDSym = Symbol();

export interface ID<T = any> {
  [IDSym]: {
    name: 'id',
    type: T,
  }
}

const hideSym = Symbol();
type Hide<T> = {
  [hideSym]: T
}

type BaseWrapper<T, isNull extends boolean, isArray extends boolean> = Hide<{
  wrapper?: {
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

type SyncColumn<T, isNull extends boolean> = Hide<{
  alias: string,
  ref: string,
  type: 'column',
  resultType?: Cover<T, isNull, false>,
}>
type EntityColumn<E extends BaseEntityKlass<any>, isNull extends boolean> = Hide<{
  type: 'relation',
  klass: string | Function,
  alias: string,
  keys: string[],
  pKey: string[],
  resultType?: Cover<E, isNull, false>,
}>

type AsyncColumn<T> = Hide<{
  type: 'async',
  resultType?: Cover<T, false, true>
}>

type TableTemplate<Entity extends BaseEntityKlass<any>> = {
  [key: string]: (funs: ColumnPointFuns<Entity>) => (SyncColumn<any, boolean> | EntityColumn<any, boolean> | AsyncColumn<any>)
}

type QueryTableBody<Entity extends BaseEntityKlass<any>, Template extends TableTemplate<Entity>> = {
  [key in Extract<keyof Template, string>]: ReturnType<Template[key]>
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

type QueryResult<Entity extends BaseEntityKlass<any>, Template extends TableTemplate<Entity>> = {
  [key in keyof Template]: NonNullable<ReturnType<Template[key]>[typeof hideSym]['resultType']>
}

type ColumnPointFuns<Entity extends BaseEntityKlass<any>> = {
  ref<T, isNull extends boolean>(
    path: (entity: Wrapper<Entity, false, false>) => Wrapper<T, isNull, false>
  ): T extends BaseEntityKlass<any> ? EntityColumn<T, isNull> : SyncColumn<T, isNull>,
  join<E extends BaseEntityKlass<any>, Template extends TableTemplate<E>>(
    extraTable: ExtraTable<E, Template, Entity>
  ): AsyncColumn<QueryResult<E, Template>> & {
    count(opt?: {
      column?: (body: QueryTableBody<E, Template>) => SyncColumn<any, boolean>,
      distinct?: boolean,
    }): SyncColumn<number, false>,
    sum<isNull extends boolean>(
      column: (body: QueryTableBody<E, Template>) => SyncColumn<number, isNull>,
    ): SyncColumn<number, isNull>,
    slice(
      skip: number,
      take: number,
    ): AsyncColumn<QueryResult<E, Template>>
  }
}

type ExtraTable<Entity extends BaseEntityKlass<any>, Template extends TableTemplate<Entity>, JoinTarget extends BaseEntityKlass<any>> = Hide<{
  klass: Type<Entity>,
  joinPath: (e: Wrapper<Entity, false, false>) => Wrapper<JoinTarget, boolean, boolean>,
  template: Template,
}>

type TableBuilder<Entity extends BaseEntityKlass<any>, Template extends TableTemplate<Entity>> = {
  byProperty<T>(path: (body: QueryTableBody<Entity, Template>) => SyncColumn<T, boolean>): {
    filter(filter: Filter<T>): {
      assert(value: 'notNull' | 'allowNull' | 'isNull'): TableBuilder<Entity, Template>
    }
    sort(sortMode: 'DESC' | 'ASC' | undefined | null): {
      setNullOn(nullMode: "NULLS FIRST" | "NULLS LAST" | null | undefined): TableBuilder<Entity, Template>
    }
  }
  query(manager: EntityManager, opts?: {
    skip?: number,
    take?: number,
  }): Promise<QueryResult<Entity, Template>[]>;
  count(manager: EntityManager): Promise<number>;
  asExtra<E extends BaseEntityKlass<any>>(
    klass: Type<E>,
    joinPath: (e: Wrapper<Entity, false, false>) => Wrapper<E, boolean, boolean>,
  ): ExtraTable<Entity, Template, E>
}

class TableTree<Entity extends BaseEntityKlass<any>> {
  constructor(
    klass: Type<Entity>,
    private qb: SelectQueryBuilder<any>
  ) {
    qb.from(klass, `body`);
    const columns = getMetadataArgsStorage().filterColumns(klass).filter((x) => x.options.select !== false);
    this.infoMap.set(this.tableTree, {
      [hideSym]: {
        type: 'relation',
        alias: `body`,
        keys: columns.map((x) => x.propertyName),
        pKey: columns.filter((a) => a.options.primary).map((x) => x.propertyName),
        klass,
      }
    })
  }
  private tableIndex = 0;
  private columnIndex = 0;
  private tableTree: any = {};

  private infoMap = new Map<any, SyncColumn<any, boolean> | EntityColumn<any, boolean>>();
  private resolveInfo(
    parent: any,
    property: string,
  ) {
    if (!this.infoMap.has(parent)) { throw new Error(`unknow error`); }
    const parentInfo = this.infoMap.get(parent)![hideSym];
    if (!parent[property]) {
      if (parentInfo.type !== 'relation') { throw new Error(`unknow error`); }
      const relation = getMetadataArgsStorage().filterRelations(parentInfo.klass).find((args) => args.propertyName === property);
      const column = getMetadataArgsStorage().filterColumns(parentInfo.klass).find((args) => args.propertyName === property);
      if (relation) {
        let alias = `table_${this.tableIndex++}`;
        const parentAlias = parentInfo.alias;
        const klass = typeof relation.type === 'string' ? relation.type : relation.type.prototype ? relation.type : relation.type();
        const columns = getMetadataArgsStorage().filterColumns(klass).filter((x) => x.options.select !== false);
        this.qb.leftJoin(`${parentAlias}.${property}`, alias)
        this.infoMap.set(parent[property] = {}, {
          [hideSym]: {
            type: 'relation',
            keys: columns.map((x) => x.propertyName),
            pKey: columns.filter((a) => a.options.primary).map((x) => x.propertyName),
            klass,
            alias,
          }
        });
      } else if (column) {
        let alias = `column_${this.columnIndex++}`;
        const parentAlias = parentInfo.alias;
        this.infoMap.set(parent[property] = {}, {
          [hideSym]: {
            type: 'column',
            ref: `${parentAlias}.${property}`,
            alias,
          }
        })
      } else {
        throw new NoPropertyError();
      }
    }
    return this.infoMap.get(parent[property])!;
  }

  resolvePath<T, isNull extends boolean>(
    path: (entity: Wrapper<Entity, false, false>) => Wrapper<T, isNull, false>
  ) {
    let target = this.tableTree;
    getPathStrArray(path).forEach((property, index, arr) => {
      try {
        this.resolveInfo(target, property);
        target = target[property];
      } catch (e) {
        if (e instanceof NoPropertyError) {
          throw new PathResolveError(`(base)->${arr.slice(0, index + 1).join(`->`)}`)
        } else {
          throw e;
        }
      }
    });
    return this.infoMap.get(target)! as T extends BaseEntityKlass<any> ? EntityColumn<T, isNull> : SyncColumn<T, isNull>;
  }
}

class TableQueryBuilder<Entity extends BaseEntityKlass<any>, Template extends TableTemplate<Entity>>{
  constructor(
    private manager: EntityManager,
    klass: Type<Entity>,
    template: Template,
  ) {
    this.qb = manager.createQueryBuilder();
    const tableTree = new TableTree(klass, this.qb);
    for (const property in template) {
      if (template.hasOwnProperty(property)) {
        this.body[property] = template[property]({
          ref: (path) => {
            const ret = tableTree.resolvePath(path);
            const info = ret[hideSym];
            if (info.type === 'column') {
              this.qb.addSelect(info.ref, info.alias);
              this.syncCallback.push((output, raw) => {
                output[property] = raw[info.alias];
              });
            } else if (info.type === 'relation') {
              this.syncCallback.push((output) => output[property] = {});
              info.keys.forEach((key) => {
                const columnInfo = tableTree.resolvePath((wrapper) => (path(wrapper) as any)[key])[hideSym];
                this.qb.addSelect(columnInfo.ref, columnInfo.alias);
                this.syncCallback.push((output, raw) => {
                  output[property][key] = raw[columnInfo.alias];
                });
              })
            } else {
              throw new Error();
            }
            return ret;
          },
          join: (extraTable) => {
            return {
              [hideSym]: {
                type: 'async',
              },
              count(opt) {
                throw new TODOError();
              },
              sum(column) {
                throw new TODOError();
              },
              slice(skip, take) {
                throw new TODOError();
              }
            }
          }
        }) as any;
      }
    }
  }
  private qb: SelectQueryBuilder<any>;
  private body: QueryTableBody<Entity, Template> = {} as QueryTableBody<Entity, Template>;
  private paramIndex = 1;
  private syncCallback = Array<(output: any, raw: any) => void>()
  andWhere(
    columnFun: (body: QueryTableBody<Entity, Template>) => SyncColumn<any, boolean>,
    fun: (alias: string, paramAliasGenerator: () => string, andWhere: SelectQueryBuilder<any>['andWhere']) => void,
  ) {
    const column = columnFun(this.body);
    fun(column[hideSym].ref, () => `params_${this.paramIndex++}`, (where, params) => this.qb.andWhere(where, params))
  }
  addOrder(
    columnFun: (body: QueryTableBody<Entity, Template>) => SyncColumn<any, boolean>,
    fun: (alias: string, addOrder: SelectQueryBuilder<any>['addOrderBy']) => void,
  ) {
    const column = columnFun(this.body);
    fun(column[hideSym].alias, (...args) => this.qb.addOrderBy(...args));
  }
  async query(opts?: {
    skip?: number,
    take?: number
  }): Promise<any[]> {
    const arr = await this.qb.getRawMany();
    return arr.map((raw) => {
      const ret = {};
      this.syncCallback.forEach((fun) => fun(ret, raw));
      return ret;
    });
  }
  async count(): Promise<number> {
    return await this.qb.getCount();
  }
}

function subTableQuery<
  Entity extends BaseEntityKlass<any>,
  Template extends TableTemplate<Entity>,
  >(
    klass: Type<Entity>,
    template: Template,
    factory: (tqb: TableQueryBuilder<Entity, Template>) => void,
): TableBuilder<Entity, Template> {
  return {
    byProperty(path) {
      return {
        filter(filter: Filter<any>) {
          return {
            assert(nullType) {
              return subTableQuery(klass, template, (tqb) => {
                tqb.andWhere(path, (alias, gen, andWhere) => {
                  if (nullType === 'isNull') {
                    andWhere(`${alias} is null`)
                  } else {
                    if (nullType === 'notNull') {
                      andWhere(`${alias} is not null`)
                    }
                    if (filter) {
                      if ('equal' in filter && !isNullOrUndefined(filter.equal)) {
                        const paramAlias = gen();
                        andWhere(`${alias} = :${paramAlias}`, { [paramAlias]: filter.equal })
                      }
                      if ('in' in filter && !isNullOrUndefined(filter.in)) {
                        if (filter.in.length === 0) {
                          throw new EmptyArrayError(`(base)->${getPathStrArray(path).join('->')}`)
                        }
                        const paramAlias = gen();
                        andWhere(`${alias} in (:...${paramAlias})`, { [paramAlias]: filter.in })
                      }
                      if ('moreOrEqual' in filter && !isNullOrUndefined(filter.moreOrEqual)) {
                        const paramAlias = gen();
                        andWhere(`${alias} >= :${paramAlias}`, { [paramAlias]: filter.moreOrEqual })
                      }
                      if ('lessOrEqual' in filter && !isNullOrUndefined(filter.lessOrEqual)) {
                        const paramAlias = gen();
                        andWhere(`${alias} <= :${paramAlias}`, { [paramAlias]: filter.lessOrEqual })
                      }
                      if ('like' in filter && !isNullOrUndefined(filter.like)) {
                        const paramAlias = gen();
                        andWhere(`${alias} like :${paramAlias}`, { [paramAlias]: filter.like })
                      }
                    }
                  }
                });
              });
            }
          }
        },
        sort(sortMode) {
          return {
            setNullOn(nullMode) {
              return subTableQuery(klass, template, (tqb) => {
                tqb.addOrder(path, (alias, addOrder) => addOrder(alias, sortMode || undefined, nullMode || undefined))
              });
            }
          }
        }
      }
    },
    asExtra(joinTargetKlass, joinPath) {
      return {
        [hideSym]: {
          klass,
          joinPath,
          template,
        }
      }
    },
    async query(manager, opts) {
      const tableQueryBuilder = new TableQueryBuilder(manager, klass, template);
      factory(tableQueryBuilder);
      return await tableQueryBuilder.query(opts);
    },
    async count(manager) {
      const tableQueryBuilder = new TableQueryBuilder(manager, klass, template);
      factory(tableQueryBuilder);
      return await tableQueryBuilder.count();
    }
  }
}

export function tableQuery<
  Entity extends BaseEntityKlass<any>,
  Template extends TableTemplate<Entity>,
  >(
    klass: Type<Entity>,
    template: Template
  ) {
  return subTableQuery(klass, template, () => { }) as TableBuilder<Entity, Template>;
}