import { CudrBaseEntity } from "./CudrBase.entity";
import { Type } from "@nestjs/common";
import { ID } from "src/utils/entity";
import { SelectQueryBuilder, EntityManager, getMetadataArgsStorage, getManager } from "typeorm";
import { UserRequirementEntity } from "src/entities";
import { isDecorated, loadDecoratorData } from "src/utils/decorator";
import { DeepQuery, CudrEntity } from "./decorators";
import { CustomerError } from "src/customer-error";
import { getTagetKey } from "src/utils/getTargetKey";
import { duplicateRemoval } from "src/utils/duplicateRemoval";

const refSym = Symbol();
const isArraySym = Symbol();
const isNullSym = Symbol();

type Cover<T1, cudrNull extends boolean, cudrArray extends boolean,
  T2 = cudrArray extends true ? T1[] : T1,
  T3 = cudrNull extends true ? T2 | null : T2,
  > = T3
type Ref<T, cudrNull extends boolean, cudrArray extends boolean> = {
  [refSym]: T,
  [isArraySym]: cudrArray,
  [isNullSym]: cudrNull,
}

type Wrapper<T extends CudrBaseEntity, cudrNull extends boolean, cudrArray extends boolean> = {
  [key in keyof T]
  : T[key] extends Function ? never
  : T[key] extends CudrBaseEntity ? Wrapper<T[key], cudrNull, cudrArray>
  : T[key] extends CudrBaseEntity | null ? T[key] extends null | infer X ? X extends CudrBaseEntity ? Wrapper<X, true, cudrArray> : never : never
  : T[key] extends Array<infer X> ? X extends CudrBaseEntity ? Wrapper<X, cudrNull, true> : Ref<T[key], cudrNull, true>
  : Ref<T[key], cudrNull, cudrArray>
}

type Filter<T> = T extends ID ? { in: T[] }
  : T extends Date ? { lessOrEqual: Date } | { moreOrEqual: Date } | { lessOrEqual: Date, moreOrEqual: Date }
  : T extends number ? { lessOrEqual: number } | { moreOrEqual: number } | { lessOrEqual: number, moreOrEqual: number }
  : T extends string ? { like: string[] } | { like: string } | { equal: string, } | { in: string[] }
  : T extends boolean ? { equal: boolean }
  : T extends null | undefined | infer X ? X extends CudrBaseEntity ? { in: X['id'][] } : never
  : never

interface loadAble<T, cudrNull extends boolean, cudrArray extends boolean> {
  [refSym]: T,
  [isArraySym]: cudrArray,
  [isNullSym]: cudrNull,
}
type WrapperInput<E extends CudrBaseEntity> = Wrapper<E, false, false>

interface QueryFuns<E extends CudrBaseEntity> {
  path<T extends CudrBaseEntity, array extends boolean,>(
    path: (entity: WrapperInput<E>) => Wrapper<T, true, array>,
    defaultValue: T,
  ): loadAble<T, false, array>
  path<T, array extends boolean>(
    path: (entity: WrapperInput<E>) => Ref<T, true, array>,
    defaultValue: T
  ): loadAble<T, false, array>
  path<T extends CudrBaseEntity, array extends boolean>(
    path: (entity: WrapperInput<E>) => Wrapper<T, false, array>,
  ): loadAble<T, false, array>
  path<T, array extends boolean>(
    path: (entity: WrapperInput<E>) => Ref<T, false, array>,
  ): loadAble<T, false, array>

  count(
    path: (entity: WrapperInput<E>) => Wrapper<CudrBaseEntity, boolean, true> | Ref<string, boolean, true>,
  ): loadAble<number, false, false>

  max(
    path: (entity: WrapperInput<E>) => Ref<number, any, true>,
  ): loadAble<number, false, false>
  min(
    path: (entity: WrapperInput<E>) => Ref<number, any, true>,
  ): loadAble<number, false, false>
  arv(
    path: (entity: WrapperInput<E>) => Ref<number, any, true>,
  ): loadAble<number, false, false>
  sum(
    path: (entity: WrapperInput<E>) => Ref<number, any, true>,
  ): loadAble<number, false, false>
}

type TableQueryBodyOption<E extends CudrBaseEntity> = {
  [key: string]: (funs: QueryFuns<E>) => loadAble<any, false, any>
}

type TableQueryBodyInput<B extends TableQueryBodyOption<any>> = {
  [key in keyof B]: ReturnType<B[key]>
}
type Simple<T extends CudrBaseEntity> = {
  [key in {
    [key in keyof T]: T[key] extends null | undefined | infer X ?
    X extends CudrBaseEntity ? never : key
    : never
  }[keyof T]]: T[key]
}
type QueryResult<B extends TableQueryBodyOption<any>> = {
  [key in keyof B]: ReturnType<B[key]> extends loadAble<infer T, infer isNull, infer isArray> ?
  T extends CudrBaseEntity ? isArray extends true ? Array<Simple<T> | (isNull extends true ? null : never)> : (Simple<T> | (isNull extends true ? null : never)) : Cover<T, isNull, isArray>
  : never
}

interface TableQueryBuilder<E extends CudrBaseEntity, B extends TableQueryBodyOption<E>> {
  filter<T extends loadAble<any, false, false>>(
    path: (body: TableQueryBodyInput<B>) => T,
    filter: T extends loadAble<infer X, false, false> ? Filter<X> : never,
  ): this;
  filterArray<T extends loadAble<any, false, true>>(
    path: (body: TableQueryBodyInput<B>) => T,
    filter: T extends loadAble<infer X, false, true> ? Filter<X> : never,
    isEmpty?: boolean | undefined,
  ): this;
  sort(path: (body: TableQueryBodyInput<B>) => loadAble<any, false, false>, mode: -1 | 0 | 1): this
  query(opts?: {
    manager?: EntityManager,
    page?: {
      index: number,
      size: number,
    }
  }): Promise<QueryResult<B>[]>;
}

function parents(klass: Type<any>) {
  const arr = [klass];
  while (klass !== Object) {
    klass = Object.getPrototypeOf(klass.prototype).constructor;
    arr.push(klass);
  }
  return arr;
}

function resolvePaths(klass: Type<any>, fun: (e: any) => any) {
  const paths = getTagetKey(fun);
  let column: string | undefined;
  paths.forEach((key, index) => {
    if (isDecorated(DeepQuery, klass, key)) {
      const { subKlass } = loadDecoratorData(DeepQuery, klass, key)();
      klass = subKlass;
    } else {
      const metaArg = getMetadataArgsStorage().filterColumns(parents(klass)).filter((arg) => arg.propertyName === key)[0];
      if (!(metaArg && paths.length === index + 1)) {
        throw new CustomerError(`${loadDecoratorData(CudrEntity, klass).name}#${key} 不存在`);
      }
      column = key;
    }
  });
  if (column) { paths.pop() }
  return { column, paths };
}

const tableAliasSym = Symbol();

export function tableQuery<E extends CudrBaseEntity, B extends TableQueryBodyOption<E>>(klass: Type<E>, body: B): TableQueryBuilder<E, B> {
  const { getTableAlias, joinTable } = (() => {
    let tableIndex = 0;
    const tableNameCache: any = {
      [tableAliasSym]: `table_${tableIndex++}`,
    }
    function joinTable(qb: SelectQueryBuilder<any>, object: any) {
      for (const key in object) {
        if (object.hasOwnProperty(key)) {
          qb.leftJoin(`${object[tableAliasSym]}.${key}`, object[key][tableAliasSym]);
          joinTable(qb, object[key]);
        }
      }
    }
    return {
      joinTable: (qb: SelectQueryBuilder<any>) => joinTable(qb, tableNameCache),
      getTableAlias: (paths: string[]) => {
        let cache = tableNameCache;
        paths.forEach((path) => {
          cache = path in cache ? cache[path] : cache[path] = {
            [tableAliasSym]: `table_${tableIndex++}`,
          }
        });
        return cache[tableAliasSym] as string;
      }
    }
  })();
  const getDefaultValueAlias = (() => {
    let valueIndex = 0;
    return () => {
      const name = `defaultValue_${valueIndex++}`;
      return name;
    }
  })();
  function getMeta(paths: string[]) {
    let subKlass = klass;
    let isArray = false;
    paths.forEach((path) => {
      const arg = getMetadataArgsStorage().filterRelations(parents(subKlass)).find((arg) => arg.propertyName === path);
      if (!arg) { throw new CustomerError(`${subKlass.name}#${path}不存在`); }
      const target = arg.type;
      if (typeof target === 'string') { throw new CustomerError(``); }
      subKlass = target() as Type<E>;
      if (arg.relationType === 'many-to-many' || arg.relationType === 'one-to-many') { isArray = true; }
    });
    return { subKlass, isArray };
  }
  const qbCallbacks = new Array<(qb: SelectQueryBuilder<any>) => void>();
  const rawResultCallbacks = new Array<(raw: any, out: any) => void>();
  let arrayAlias = new Array<string>();
  for (const keyAlias in body) {
    if (body.hasOwnProperty(keyAlias)) {
      const element = body[keyAlias];
      element({
        path: (fun: (w: WrapperInput<E>) => any, defaultValue?: any) => {
          const { column, paths } = resolvePaths(klass, fun);
          const { subKlass, isArray } = getMeta(paths);
          if (isArray) { arrayAlias.push(keyAlias); }
          const tableAlias = getTableAlias(paths);
          if (defaultValue === undefined) {
            if (column) {
              qbCallbacks.push((qb) => {
                qb.addSelect(`${tableAlias}.${column}`, keyAlias);
              });
              rawResultCallbacks.push((raw, out) => {
                out[keyAlias] = raw[keyAlias];
              });
            } else {
              qbCallbacks.push((qb) => {
                qb.addSelect(`${tableAlias}`, keyAlias);
              });
              rawResultCallbacks.push((raw, out) => {
                out[keyAlias] = {};
                getMetadataArgsStorage().filterColumns(parents(subKlass)).forEach((arg) => {
                  const name = arg.options.name || arg.propertyName;
                  out[keyAlias][arg.propertyName] = raw[`${tableAlias}_${name}`];
                });
              });
            }
          } else {
            if (column) {
              const defaultValueAlias = getDefaultValueAlias();
              qbCallbacks.push((qb) => {
                qb.addSelect(`if(${tableAlias}.${column} is null,:${defaultValueAlias},${tableAlias}.${column})`, keyAlias);
                qb.setParameter(defaultValueAlias, defaultValue);
              });
              rawResultCallbacks.push((raw, out) => {
                out[keyAlias] = raw[keyAlias];
              });
            } else {
              qbCallbacks.push((qb) => {
                qb.addSelect(`${tableAlias}`, keyAlias);
              });
              rawResultCallbacks.push((raw, out) => {
                if (raw[`${keyAlias}_id`] === null) {
                  out[keyAlias] = defaultValue
                } else {
                  out[keyAlias] = {};
                  getMetadataArgsStorage().filterColumns(parents(klass)).forEach((arg) => {
                    const name = arg.options.name || arg.propertyName;
                    out[keyAlias][arg.propertyName] = raw[`${keyAlias}_${name}`];
                  });
                }
              });
            }
          }
          return {} as loadAble<any, any, any>;
        },
        count: (fun) => {
          const { column, paths } = resolvePaths(klass, fun);
          if (column) {

          } else {

          }
          return {} as loadAble<any, any, any>;
        },
        min: (fun) => {
          const { column, paths } = resolvePaths(klass, fun);

          return {} as loadAble<any, any, any>;
        },
        max: (fun) => {
          const { column, paths } = resolvePaths(klass, fun);

          return {} as loadAble<any, any, any>;
        },
        arv: (fun) => {
          const { column, paths } = resolvePaths(klass, fun);

          return {} as loadAble<any, any, any>;
        },
        sum: (fun) => {
          const { column, paths } = resolvePaths(klass, fun);

          return {} as loadAble<any, any, any>;
        },
      })
    }
  }
  const builder: TableQueryBuilder<E, B> = {
    filter: () => {
      return builder;
    },
    filterArray: () => {
      return builder;
    },
    sort: () => {
      return builder;
    },
    query: async (opts) => {
      opts = opts || {};
      const manager = opts.manager || getManager();
      const qb = manager.createQueryBuilder().from(klass, getTableAlias([]));
      qbCallbacks.forEach((fun) => fun(qb));
      joinTable(qb);
      if (arrayAlias.length !== 0) {
        qb.addSelect(`${getTableAlias([])}.id`, 'mergeId');
      }
      const results = await qb.getRawMany();
      const coverResults = results.map((raw) => {
        const out: any = {};
        rawResultCallbacks.forEach((fun) => fun(raw, out));
        return out
      });
      if (arrayAlias.length === 0) {
        return coverResults;
      } else {
        return duplicateRemoval(coverResults, (result) => result.mergeId).map((r) => {
          const willMerge = coverResults.filter((c) => c.mergeId === r.mergeId);
          arrayAlias.forEach((alias) => {
            r[alias] = willMerge.map((w) => w[alias]);
          });
          return r;
        })
      }
    }
  };
  return builder;
}
