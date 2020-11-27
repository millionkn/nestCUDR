import { CudrBaseEntity } from "./CudrBase.entity";
import { Type } from "@nestjs/common";
import { ID } from "src/utils/entity";
import { SelectQueryBuilder, EntityManager, getMetadataArgsStorage } from "typeorm";
import { UserRequirementEntity } from "src/entities";
import { isDecorated, loadDecoratorData } from "src/utils/decorator";
import { DeepQuery, CudrEntity } from "./decorators";
import { CustomerError } from "src/customer-error";
import { getTagetKey } from "src/utils/getTargetKey";

const refSym = Symbol();

type Cover<T1, cudrNull extends boolean, cudrArray extends boolean,
  T2 = cudrArray extends true ? T1[] : T1,
  T3 = cudrNull extends true ? T2 | null : T2,
  > = T3
type Ref<T, cudrNull extends boolean, cudrArray extends boolean> = {
  [refSym]: Cover<T, cudrNull, cudrArray>
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
const loadSym = Symbol();
interface loadAble<T, cudrNull extends boolean, cudrArray extends boolean> {
  [loadSym]: Cover<T, cudrNull, cudrArray>;
}
type WrapperInput<E extends CudrBaseEntity> = Wrapper<E, false, false>

interface QueryFuns<E extends CudrBaseEntity> {
  path<T, array extends boolean>(
    path: (entity: WrapperInput<E>) => T extends CudrBaseEntity ? Wrapper<T, false, array> : Ref<T, false, array>,
  ): loadAble<T, false, array>
  path<T, array extends boolean, ET extends T>(
    path: (entity: WrapperInput<E>) => T extends CudrBaseEntity ? Wrapper<T, true, array> : Ref<T, true, array>,
    defaultValue: ET | null,
  ): loadAble<T, false, array>
  count(
    path: (entity: WrapperInput<E>) => Wrapper<CudrBaseEntity, boolean, true> | Ref<string, boolean, true> | Ref<ID, boolean, true>,
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
  query(qb: SelectQueryBuilder<E>, page?: {
    pageIndex: number,
    pageSize: number,
  }): Promise<QueryResult<B>[]>;
}

function resolvePaths(klass: Type<any>, fun: (e: any) => any) {
  const paths = getTagetKey(fun);
  let column: string | undefined;
  paths.forEach((key, index) => {
    if (isDecorated(DeepQuery, klass, key)) {
      const { subKlass } = loadDecoratorData(DeepQuery, klass, key)();
      klass = subKlass;
    } else {
      const metaArg = getMetadataArgsStorage().filterColumns(klass).filter((arg) => arg.propertyName === key)[0];
      if (!(metaArg && paths.length === index + 1)) {
        throw new CustomerError(`${loadDecoratorData(CudrEntity, klass).name}#${key} 不存在`);
      }
      column = key;
    }
  });
  if (column) { paths.pop() }
  return { column, paths };
}

const tableIndexSym = Symbol();

export function tableQuery<E extends CudrBaseEntity, B extends TableQueryBodyOption<E>>(klass: Type<E>, body: B): TableQueryBuilder<E, B> {
  let tableIndex = 0;
  const tableNameCache: any = {
    [tableIndexSym]: tableIndex++
  }
  function getTableIndex(paths: string[]): number {
    let cache = tableNameCache;
    paths.forEach((path, index) => {
      cache = path in cache ? cache[path] : cache[path] = {
        [tableIndexSym]: tableIndex++,
      }
    });
    return cache[tableIndexSym];
  }
  const callbacks = new Array<(qb: SelectQueryBuilder<any>) => void>();
  for (const alias in body) {
    if (body.hasOwnProperty(alias)) {
      const element = body[alias];
      element({
        path: (fun: (w: WrapperInput<E>) => any, defaultValue?: any) => {
          const { column, paths } = resolvePaths(klass, fun);
          callbacks.push((qb) => {
            qb.addSelect(`table_${getTableIndex(paths)}${column ? `.${column}`: ''}`, alias);
          })
          return {} as loadAble<any, any, any>;
        },
        count: (fun) => {
          const { column, paths } = resolvePaths(klass, fun);

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
    query: async () => {
      return []
    }
  };
  return builder;
}

tableQuery(UserRequirementEntity, {
  test2: ({ path }) => path((e) => e.user.name, '--')
})
  .filter((e) => e.test2, { in: ['--'] })
  .query(123 as any)