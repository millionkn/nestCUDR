import { _PickOnValueNotIs, _PickOnString, KeysOnValueIs } from "@/utils/types";
import { Type } from "@nestjs/common";
import { EntityManager, SelectQueryBuilder, getMetadataArgsStorage } from "typeorm";
import { TODOError } from "./errors";
import { UTN, PrimaryEntity, _UnpackPrimaryKey } from "./types";
import { TableEntity } from "./TableEntity";
import { getPathStrArray } from "@/utils/getPathStrArray";
import { RelationTypeInFunction } from "typeorm/metadata/types/RelationTypeInFunction";


const hideSym = Symbol();

type Simple<T> = T extends TableEntity ? _PickOnString<_PickOnValueNotIs<UTN<T>, TableEntity | Array<TableEntity> | null | undefined | ((...args: any[]) => any)>> : T

type Resolve<T, isNull extends boolean, isArray extends boolean> = isArray extends true ? T[] : isNull extends true ? null | T : T;
type AsyncColumnPoint<Entity extends TableEntity, T> = {
  [hideSym]: {
    __primaryType?: () => Resolve<T extends TableEntity ? PrimaryEntity<_UnpackPrimaryKey<T>> : _UnpackPrimaryKey<T>, false, false>
    __resultType?: () => Resolve<T extends TableEntity ? Simple<T> : T, false, false>
    attach(query: Query<Entity>): void
    callback: (raws: any[]) => void
  }
}
type SyncColumnPoint<Entity extends TableEntity, T, isNull extends boolean> = {
  [hideSym]: {
    __filterType?: () => T,
    __primaryType?: () => Resolve<T extends TableEntity ? PrimaryEntity<_UnpackPrimaryKey<T>> : _UnpackPrimaryKey<T>, isNull, false>
    __resultType?: () => Resolve<T extends TableEntity ? Simple<T> : T, isNull, false>
    filter(
      query: Query<Entity>,
      filter: Filter<T>,
      nullMode: 'notNull' | 'allowNull' | 'isNull' | null | undefined,
    ): void;
    sort(
      query: Query<Entity>,
      sortMode: 'DESC' | 'ASC' | undefined | null,
      nullMode: "NULLS FIRST" | "NULLS LAST" | null | undefined,
    ): void;
    sequence(query: Query<Entity>, sequenceBuilder: SequenceBuilder<Entity>): void
  }
}

type ColumnPoint<Entity extends TableEntity, T, isNull extends boolean, isArray extends boolean> = isArray extends true ? AsyncColumnPoint<Entity, T> : SyncColumnPoint<Entity, T, isNull>

type ColumnPointType<CP extends ColumnPoint<any, any, any, any>, name extends keyof CP[typeof hideSym]> = CP[typeof hideSym][name] extends (undefined | (() => infer F)) ? F : never
type Wrapper<Entity extends TableEntity, T, isNull extends boolean, isArray extends boolean> = ColumnPoint<Entity, T, isNull, isArray> & (T extends TableEntity ? {
  [key in keyof UTN<T>]
  : T[key] extends Function ? never
  : T[key] extends TableEntity ? Wrapper<Entity, T[key], isNull, isArray>
  : T[key] extends Array<infer X> ? Wrapper<Entity, X, isNull, true>
  : T[key] extends null | undefined | infer X ? Wrapper<Entity, X, null extends T[key] ? true : undefined extends T[key] ? true : isNull, isArray>
  : never
} : unknown)

type QueryFuns<Entity extends TableEntity> = {
  ref<CP extends ColumnPoint<Entity, any, boolean, true | false>>(path: (entity: Wrapper<Entity, Entity, false, false>) => CP): CP,
};

type QueryTemplate<Entity extends TableEntity> = { [key: string]: (funs: QueryFuns<Entity>) => ColumnPoint<Entity, any, boolean, boolean> }

type QueryTableBody<Entity extends TableEntity, Template extends QueryTemplate<Entity>> = {
  [key in Extract<keyof Template, string>]: ReturnType<Template[key]>
} & {};

type Filter<T> = null | undefined | (T extends Date ? { lessOrEqual?: Date, moreOrEqual?: Date }
  : T extends number ? { lessOrEqual?: number, moreOrEqual?: number, in?: number[], equal?: number }
  : T extends string ? { like?: string, equal?: string, in?: string[] }
  : T extends boolean ? { equal?: boolean }
  : T extends TableEntity ? { equal?: PrimaryEntity<T>, in?: PrimaryEntity<T>[] }
  : { equal?: T, in?: T[] });

interface TableBuilder<Entity extends TableEntity, Template extends QueryTemplate<Entity>> {
  byProperty<CP extends SyncColumnPoint<Entity, any, boolean>>(path: (body: QueryTableBody<Entity, Template>) => CP): {
    filter(filter: Filter<ColumnPointType<CP, '__filterType'>>): {
      assert(nullMode: 'notNull' | 'allowNull' | 'isNull' | null | undefined): TableBuilder<Entity, Template>
    }
    sort(sortMode: 'DESC' | 'ASC' | undefined | null): {
      setNullOn(nullMode: "NULLS FIRST" | "NULLS LAST" | null | undefined): TableBuilder<Entity, Template>
    }
  }
  bySequence<Ts extends ColumnPoint<Entity, any, boolean, false>[]>(
    ...paths: { [index in keyof Ts]: (body: QueryTableBody<Entity, Template>) => Ts[index] }
  ): {
    equal(sequence: { [index in keyof Ts]: Ts[index] extends ColumnPoint<Entity, any, boolean, false> ? ColumnPointType<Ts[index], '__primaryType'> : Ts[index] }): TableBuilder<Entity, Template>,
    in(sequenceArr: { [index in keyof Ts]: Ts[index] extends ColumnPoint<Entity, any, boolean, false> ? ColumnPointType<Ts[index], '__primaryType'> : Ts[index] }[]): TableBuilder<Entity, Template>,
  }

  query(manager: EntityManager, opts?: {
    skip?: number,
    take?: number,
  }): Promise<{ [key in keyof Template]: ColumnPointType<ReturnType<Template[key]>, '__resultType'> }[]>;
  count(manager: EntityManager): Promise<number>;
}

class Query<Entity extends TableEntity>{
  private tableIndex = 0;
  private root: any = {};
  private cache = new Map<any, { alias: string }>();
  private joinFun = new Array<(qb: SelectQueryBuilder<any>) => void>();
  constructor(
    public qb: SelectQueryBuilder<any>,
    klass: Type<Entity>,
  ) {
    const alias = `table_${this.tableIndex++}`;
    this.joinFun.push((qb) => { qb.from(klass, alias) });
    this.cache.set(this.root, { alias })
  }
  resolvePath(
    path: (entity: Wrapper<Entity, Entity, false, false>) => SyncColumnPoint<Entity, any, boolean>
  ) {
    const pathArr = getPathStrArray(path);
    const col = pathArr.pop();
    if (!col) { throw new Error(); }
    let targetNode = this.root;
    for (const next of pathArr) {
      if (!(next in targetNode)) {
        const nextAlias = `table_${this.tableIndex++}`;
        const currentCache = this.cache.get(targetNode);
        if (!currentCache) { throw new Error(); }
        this.cache.set(targetNode[next] = {}, { alias: nextAlias });
        this.joinFun.push((qb) => { qb.leftJoin(`${currentCache.alias}.${next}`, nextAlias) });
      }
      targetNode = targetNode[next];
    }
    const cache = this.cache.get(targetNode);
    if (!cache) { throw new Error(); }
    return [`\`${cache.alias}\``, `\`${col}\``];
  }
  private paramIndex = 0;
  generateParamAlias() {
    return `param_${this.paramIndex++}`;
  }
}

class SequenceBuilder<Entity extends TableEntity> {
  private index = 0;
  private array = new Array<{ index: number, alias: string, resolver: (value: any) => any }>();
  addResolver(resolverObject: { [alias: string]: (value: any) => any }) {
    const index = this.index++;
    for (const alias in resolverObject) {
      if (Object.prototype.hasOwnProperty.call(resolverObject, alias)) {
        const resolver = resolverObject[alias];
        this.array.push({
          index,
          alias,
          resolver,
        })
      }
    }
  }
  in(query: Query<Entity>, sequenceArr: any[][]) {
    const title = this.array.map((object) => object.alias).join(',');
    const alias = query.generateParamAlias();
    query.qb.andWhere(`(${title}) in (:...${alias})`, { [alias]: sequenceArr.map((sequence) => this.array.map((object) => object.resolver(sequence[object.index]))) });
  }
  equal(query: Query<Entity>, sequence: any[]) {
    const title = this.array.map((object) => object.alias).join(',');
    const alias = query.generateParamAlias();
    query.qb.andWhere(`(${title}) = ${alias}`, { [alias]: this.array.map((object) => object.resolver(sequence[object.index])) });
  }
}

function isAsyncRef<Entity extends TableEntity>(path: (wrapper: Wrapper<Entity, Entity, false, false>) => ColumnPoint<Entity, any, boolean, boolean>): path is (wrapper: Wrapper<any, any, false, false>) => ColumnPoint<any, any, boolean, true> {
  throw new TODOError();
}
function isSyncRef<Entity extends TableEntity>(path: (wrapper: Wrapper<Entity, Entity, false, false>) => ColumnPoint<Entity, any, boolean, boolean>): path is (wrapper: Wrapper<any, any, false, false>) => ColumnPoint<any, any, boolean, false> {
  throw new TODOError();
}
function getPrimaryColumn<Entity extends TableEntity>(
  klass: Type<Entity>,
  path: (wrapper: Wrapper<Entity, Entity, false, false>) => ColumnPoint<Entity, any, boolean, boolean>,
) {
  let target: Function | string = klass;
  const storage = getMetadataArgsStorage();
  for (const next of getPathStrArray(path)) {
    const typeFun: RelationTypeInFunction | undefined = storage.filterRelations(target).find((col) => col.propertyName === next)?.type;
    if (typeFun === undefined) {
      return null;
    } else if (typeof typeFun === 'string') {
      target = typeFun;
    } else if (typeFun.prototype) {
      target = typeFun;
    } else {
      target = typeFun();
    }
  }
  return storage.filterColumns(target).filter((col) => col.options.primary).map((x) => x.propertyName);
}
function subQuery<
  Entity extends TableEntity,
  Template extends QueryTemplate<Entity>,
  >(
    klass: Type<Entity>,
    queryTemplate: Template,
    factory: (args: {
      body: QueryTableBody<Entity, Template>,
      query: Query<Entity>,
    }) => void,
): TableBuilder<Entity, Template> {
  return {
    byProperty(path) {
      return {
        filter(filter) {
          return {
            assert(nullMode) {
              return subQuery(klass, queryTemplate, (args) => {
                factory(args);
                path(args.body)[hideSym].filter(args.query, filter, nullMode);
              });
            }
          }
        },
        sort(sortMode) {
          return {
            setNullOn(nullMode) {
              return subQuery(klass, queryTemplate, (args) => {
                factory(args);
                path(args.body)[hideSym].sort(args.query, sortMode, nullMode);
              });
            }
          }
        }
      }
    },
    bySequence(...paths) {
      return {
        equal(sequence) {
          return subQuery(klass, queryTemplate, (args) => {
            factory(args);
            const sb = new SequenceBuilder();
            paths.forEach((path) => {
              path(args.body)[hideSym].sequence(args.query, sb)
            });
            sb.equal(args.query, sequence);
          });
        },
        in(sequenceArr) {
          return subQuery(klass, queryTemplate, (args) => {
            factory(args);
            const sb = new SequenceBuilder();
            paths.forEach((path) => {
              path(args.body)[hideSym].sequence(args.query, sb)
            });
            sb.in(args.query, sequenceArr);
          });
        }
      }
    },
    async query(manager, opts) {
      const body: QueryTableBody<Entity, Template> = {} as any;
      const callback = new Array<(output: any, raw: any) => void>();
      for (const key in queryTemplate) {
        if (Object.prototype.hasOwnProperty.call(queryTemplate, key)) {
          body[key] = queryTemplate[key]({
            ref(path) {
              if (isAsyncRef(path)) {
                const hide: ReturnType<typeof path>[typeof hideSym] = {
                  attach(query) {
                    throw new TODOError();
                  },
                  callback(raws) {
                    throw new TODOError();
                  }
                }
                return { [hideSym]: hide } as any;
              } else if (isSyncRef(path)) {
                const hide: ReturnType<typeof path>[typeof hideSym] = {
                  filter(query, filter, nullMode) {
                    const alias = query.resolvePath(path).join('.');
                    if (nullMode === 'isNull') {
                      query.qb.andWhere(`${alias} is null`);
                    } else {
                      if (nullMode === 'notNull') {
                        query.qb.andWhere(`${alias} is not null`);
                      }
                      if (filter) {
                        const primaryColumns = getPrimaryColumn(klass, path);
                        if ('equal' in filter && filter.equal) {
                          if (primaryColumns) {
                            new SequenceBuilder().addResolver()
                          } else {
                            const paramAlias = query.generateParamAlias();
                            query.qb.andWhere(`${alias} = :${paramAlias}`, { [paramAlias]: filter.equal })
                          }
                        }
                        if ('in' in filter && filter.in) {
                          const paramAlias = query.generateParamAlias();
                          query.qb.andWhere(`${alias} in (:...${paramAlias})`, { [paramAlias]: filter.in })
                        }
                        if ('moreOrEqual' in filter && filter.moreOrEqual) {
                          const paramAlias = query.generateParamAlias();
                          query.qb.andWhere(`${alias} >= :${paramAlias}`, { [paramAlias]: filter.moreOrEqual })
                        }
                        if ('lessOrEqual' in filter && filter.lessOrEqual) {
                          const paramAlias = query.generateParamAlias();
                          query.qb.andWhere(`${alias} <= :${paramAlias}`, { [paramAlias]: filter.lessOrEqual })
                        }
                        if ('like' in filter && filter.like) {
                          const paramAlias = query.generateParamAlias();
                          query.qb.andWhere(`${alias} like :${paramAlias}`, { [paramAlias]: filter.like })
                        }
                      }
                    }
                  },
                  sort(query, sortMode, nullMode) {
                    const alias = query.resolvePath(path).join('.');
                    query.qb.addOrderBy(alias, sortMode || undefined, nullMode || undefined);
                  },
                  sequence(query, sequenceBuilder) {
                    sequenceBuilder.addResolver({

                    })
                    throw new TODOError();
                  },
                }
                return { [hideSym]: hide } as any;
              } else {
                throw new Error();
              }
            },
          }) as any;
        }
      }
      const qb = manager.createQueryBuilder()
      const query = new Query(qb, klass);
      factory({ body, query });
      qb.skip(opts?.skip || undefined);
      qb.take(opts?.take || undefined);
      const raws = await qb.getRawMany();
      const results = raws.map((raw) => {
        const output: any = {};
        callback.forEach((cb) => cb(output, raw));
        return output;
      });
      return results;
    },
    count(manager) {
      throw new TODOError();
    }
  }
}

export function entityQuery<
  Entity extends TableEntity,
  Template extends QueryTemplate<Entity>,
  >(
    klass: Type<Entity>,
    queryTemplate: Template,
): TableBuilder<Entity, Template> {
  return subQuery(klass, queryTemplate, () => { });
}
