import { CudrBaseEntity } from "./CudrBase.entity";
import { Type } from "@nestjs/common";
import { ID } from "@/utils/entity";
import { EntityManager, SelectQueryBuilder, getMetadataArgsStorage } from "typeorm";
import { UserRequirementEntity, UserEntity } from "@/entities";
import { getPathStrArray } from "@/utils/getPathStrArray";
import { CustomerError } from "@/customer-error";

const typeSym = Symbol();
const dataSym = Symbol();

type Cover<T1, cudrNull extends boolean, cudrArray extends boolean,
  T2 = cudrNull extends true ? T1 | null : T1,
  T3 = cudrArray extends true ? T1[] : T2,
  > = T3
interface WrapperPoint<T, cudrNull extends boolean, cudrArray extends boolean> {
  [typeSym]?: {
    name: 'WrapperPoint',
    type: T,
    isArray: cudrArray,
    isNull: cudrNull,
  },
}
type WrapperEntity<T extends CudrBaseEntity, cudrNull extends boolean, cudrArray extends boolean> = {
  [key in keyof T]
  : T[key] extends Function ? never
  : T[key] extends CudrBaseEntity ? Wrapper<T[key], cudrNull, cudrArray>
  : T[key] extends CudrBaseEntity | null | undefined ? Exclude<T[key], null | undefined> extends CudrBaseEntity ? Wrapper<Exclude<T[key], null | undefined>, true, cudrArray> : never
  : T[key] extends Array<infer X> ? X extends CudrBaseEntity ? Wrapper<X, cudrNull, true> : WrapperPoint<X, cudrNull, true>
  : WrapperPoint<T[key], cudrNull, cudrArray>
}

type Wrapper<T, cudrNull extends boolean, cudrArray extends boolean> = T extends CudrBaseEntity ? WrapperEntity<T, cudrNull, cudrArray> & WrapperPoint<T, cudrNull, cudrArray> : WrapperPoint<T, cudrNull, cudrArray>;

type Filter<T> = T extends ID ? { in: T[] }
  : T extends Date ? { lessOrEqual: Date } | { moreOrEqual: Date } | { lessOrEqual: Date, moreOrEqual: Date }
  : T extends number ? { lessOrEqual: number } | { moreOrEqual: number } | { lessOrEqual: number, moreOrEqual: number }
  : T extends string ? { like: string } | { equal: string } | { in: string[] }
  : T extends boolean ? { equal: boolean }
  : T extends CudrBaseEntity ? { in: T['id'][] }
  : never;

interface Column<T, cudrNull extends boolean, cudrArray extends boolean> {
  [typeSym]?: {
    name: 'Column',
    type: T,
    isNull: cudrNull,
    isArray: cudrArray,
  }
  [dataSym]: {
    path: (entity: Wrapper<CudrBaseEntity<any>, false, false>) => WrapperPoint<any, any, any>
  }
}

interface QueryFuns<E extends CudrBaseEntity> {
  ref<T, isNull extends boolean, isArray extends boolean>(
    path: (entity: Wrapper<E, false, false>) => WrapperPoint<T, isNull, isArray>
  ): Column<T, isNull, isArray>
  join<T extends CudrBaseEntity, B extends TableQueryBody<T>>(
    subQuery: SubTableQuery<T, B, E>
  ): Column<QueryResult<B>, false, true> & {
    count(): Column<number, false, false>
    count(path: (queryColumns: QueryColumns<B>) => Column<any, false, false>): Column<number, false, false>
    sum(path: (queryColumns: QueryColumns<B>) => Column<number, false, false>): Column<number, false, false>
  }
}

type TableQueryBody<E extends CudrBaseEntity<any>> = {
  [key: string]: (funs: QueryFuns<E>) => Column<any, any, any>
}
type QueryColumns<T extends TableQueryBody<any>> = {
  [key in keyof T]: ReturnType<T[key]>
}
export type Simple<T extends CudrBaseEntity> = {
  [key in {
    [key in keyof T]: T[key] extends null | undefined | infer X
    ? X extends CudrBaseEntity ? never
    : X extends CudrBaseEntity[] ? never
    : key
    : never
  }[keyof T]]: T[key]
}
type QueryResult<B extends TableQueryBody<any>> = {
  [key in keyof B]: ReturnType<B[key]> extends Column<infer T, infer isNull, infer isArray> ?
  T extends CudrBaseEntity ? Cover<Simple<T>, isNull, isArray> : Cover<T, isNull, isArray>
  : never
}

type SubTableQuery<E extends CudrBaseEntity, B extends TableQueryBody<E>, O extends CudrBaseEntity> = {
  [typeSym]?: {
    name: 'subQuery'
    klass: E
    body: B,
    outType: O,
  }
}

interface TableQueryBuilder<E extends CudrBaseEntity, B extends TableQueryBody<E>> {
  [dataSym]: {
    factoryFun: (
      qb: SelectQueryBuilder<any>,
      tools: QueryTools,
      columnNode: (columnRef: (queryColumns: QueryColumns<B>) => Column<any, any, false>) => RefNode<any>
    ) => Promise<void>,
  },
  byProperty<T, isNull extends boolean>(path: (queryColumns: QueryColumns<B>) => Column<T, isNull, false>): {
    filter(filter: Filter<T> | null | undefined): {
      assertNull(value: boolean | null | undefined): TableQueryBuilder<E, B>
    }
    sort(sortMode: 'DESC' | 'ASC' | undefined | null): {
      setNullOn(nullMode: "NULLS FIRST" | "NULLS LAST" | null | undefined): TableQueryBuilder<E, B>
    }
  }
  byArray<T>(path: (queryColumns: QueryColumns<B>) => Column<T, false, true>): {
    filter: (mode: 'isEmpty' | 'notEmpty' | undefined | null) => TableQueryBuilder<E, B>
  }
  query(manager: EntityManager, opts?: {
    skip?: number,
    take?: number,
  }): Promise<QueryResult<B>[]>;
  asSubQuery<T extends CudrBaseEntity>(joinPath: (e: Wrapper<E, false, false>) => Wrapper<T, any, false>): SubTableQuery<E, B, T>
}

function builderAppend<Builder extends TableQueryBuilder<any, any>>(
  builder: Builder,
  appendFun: (
    qb: SelectQueryBuilder<any>,
    tools: QueryTools,
    columnNode: (columnRef: (queryColumns: QueryColumns<any>) => Column<any, any, false>) => RefNode<any>
  ) => Promise<void>,
): Builder {
  return {
    ...builder,
    [dataSym]: {
      factoryFun: async (...args) => {
        await builder[dataSym].factoryFun(...args);
        await appendFun(...args);
      },
    }
  };
}

type RefNode<T extends CudrBaseEntity> = {
  [key in keyof T]?: T[key] extends CudrBaseEntity ? RefNode<T[key]> : {};
}

type QueryTools = ReturnType<typeof createTools>;

function createTools<T extends CudrBaseEntity>(klass: Type<T>) {
  const storage = getMetadataArgsStorage();
  let tableIndex = 0;
  const relationTree: RefNode<T> = {};
  const klassMap = new Map<RefNode<CudrBaseEntity>, Type<CudrBaseEntity>>();
  klassMap.set(relationTree, klass);
  const aliasMap = new Map<RefNode<CudrBaseEntity>, string>();
  aliasMap.set(relationTree, `table_${tableIndex++}`);
  const parentNodeMap = new Map<RefNode<any>, RefNode<CudrBaseEntity>>();
  const selectMarkMap = new Map<RefNode<any>, true>();
  const keyMap = new Map<RefNode<any>, string>();
  function buildRelationTree(strArray: string[], currentNode: RefNode<any> = relationTree) {
    let lastNode: null | RefNode<any> = null;
    for (let i = 0; i < strArray.length; i++) {
      const property = strArray[i];
      let nextNode = currentNode[property];
      if (nextNode) {
        currentNode = nextNode;
        continue;
      }
      const currentKlass = klassMap.get(currentNode)!;
      const column = storage.filterColumns(currentKlass).find((col) => col.propertyName === property);
      const relation = storage.filterRelations(currentKlass).find((relation) => relation.propertyName === property);
      if (relation) {
        const target = relation.target;
        if (!(typeof target === 'function')) {
          throw new Error(`${strArray.slice(0, i).join('->')}关系必须使用Class进行标记`);
        }
        nextNode = {};
        klassMap.set(nextNode, target as Type<any>);
        aliasMap.set(nextNode, `table_${tableIndex++}`);
      } if (column) {
        nextNode = {};
      } else {
        throw new CustomerError(`${strArray.slice(0, i).join('->')}不存在`);
      }
      lastNode = currentNode;
      currentNode = nextNode;
      parentNodeMap.set(currentNode, lastNode);
      keyMap.set(currentNode, property)
    }
  }
  let paramsIndex = 0;
  return {
    isTable(node: RefNode<any>): node is RefNode<CudrBaseEntity> {
      return aliasMap.has(node);
    },
    isGetId(node: RefNode<any>) {
      return this.getKey(node) === 'id';
    },
    getKlass(node: RefNode<CudrBaseEntity>) {
      return klassMap.get(node)!;
    },
    getKey(node: RefNode<any>) {
      return keyMap.get(node);
    },
    getAlias(node: RefNode<any>) {
      return aliasMap.get(node);
    },
    getParent(node: RefNode<any>) {
      return parentNodeMap.get(node);
    },
    getNode(path: (entity: Wrapper<T, false, false>) => any, node: RefNode<any> = relationTree): RefNode<any> {
      const pathStrArray = getPathStrArray(path);
      buildRelationTree(pathStrArray, node);
      return path(node as Wrapper<T, false, false>);
    },
    markSelect(node: RefNode<any>) {
      const klass = klassMap.get(node)!;
      if (this.isTable(node)) {
        storage.filterColumns(klass).forEach((col) => {
          const targetNode = this.getNode((e: any) => e[col.propertyName], node)
          selectMarkMap.set(targetNode, true);
        });
      } else {
        selectMarkMap.set(node, true);
      }
    },
    generateParamAlias() {
      return `params_${paramsIndex++}`;
    },
  }
}

export function tableQuery<E extends CudrBaseEntity, B extends TableQueryBody<E>>(klass: Type<E>, body: B) {
  const builder: TableQueryBuilder<E, B> = {
    [dataSym]: {
      factoryFun: async () => { },
    },
    byProperty(path) {
      return {
        filter(filter: Filter<any> | null | undefined) {
          return {
            assertNull(assert) {
              return builderAppend(builder, async (qb, tools, getNode) => {
                const node = getNode(path);
                let targetRefStr: string;
                if (tools.isTable(node)) {
                  const parentNode = tools.getParent(node);
                  targetRefStr = parentNode ? `${tools.getAlias(parentNode)}.${tools.getKey(node)}` : `${tools.getAlias(node)}.id`;
                } else {
                  const parentNode = tools.getParent(node)!;
                  targetRefStr = `${tools.getAlias(parentNode)}.${tools.getKey(node)}`;
                }
                if (assert === true) {
                  qb.andWhere(`${targetRefStr} is null`);
                } else if (assert === false) {
                  qb.andWhere(`${targetRefStr} is not null`);
                }
                if (filter) {
                  if ('in' in filter) {
                    const paramAlias = tools.generateParamAlias();
                    qb.andWhere(`${targetRefStr} in (:...${paramAlias})`, { [paramAlias]: filter.in });
                  }
                  if ('lessOrEqual' in filter) {
                    const paramAlias = tools.generateParamAlias();
                    qb.andWhere(`${targetRefStr} <= ${paramAlias}`, { [paramAlias]: filter.lessOrEqual });
                  }
                  if ('moreOrEqual' in filter) {
                    const paramAlias = tools.generateParamAlias();
                    qb.andWhere(`${targetRefStr} >= ${paramAlias}`, { [paramAlias]: filter.moreOrEqual });
                  }
                  if ('like' in filter) {
                    const paramAlias = tools.generateParamAlias();
                    qb.andWhere(`${targetRefStr} like ${paramAlias}`, { [paramAlias]: filter.like });
                  }
                  if ('equal' in filter) {
                    const paramAlias = tools.generateParamAlias();
                    qb.andWhere(`${targetRefStr} = ${paramAlias}`, { [paramAlias]: filter.equal });
                  }
                }
              });
            }
          }
        },
        sort(sortMode) {
          return {
            setNullOn(nullMode) {
              return builderAppend(builder, async (qb, tools, getNode) => {
                const node = getNode(path);
                let targetRefStr: string;
                if (tools.isTable(node)) {
                  const parentNode = tools.getParent(node);
                  targetRefStr = parentNode ? `${tools.getAlias(parentNode)}.${tools.getKey(node)}` : `${tools.getAlias(node)}.id`;
                } else {
                  const parentNode = tools.getParent(node)!;
                  targetRefStr = `${tools.getAlias(parentNode)}.${tools.getKey(node)}`;
                }
                qb.orderBy(`${targetRefStr}`, sortMode || undefined, nullMode || undefined);
              });
            }
          }
        }
      }
    },
    byArray(pathFun) {
      return {
        filter(mode) {
          return builderAppend(builder, async (qb, tools) => {
            throw new Error();
          });
        }
      }
    },
    asSubQuery(joinPath) {
      throw new Error();
    },
    async query(manager, opt): Promise<QueryResult<B>[]> {
      const tools = createTools(klass);
      const queryColumns: QueryColumns<B> = {} as any;
      for (const key in body) {
        if (body.hasOwnProperty(key)) {
          const element = body[key];
          queryColumns[key] = element({
            ref(path) {
              tools.markSelect(tools.getNode(path));
              return {
                [dataSym]: {
                  path: (entity) => path(entity as any),
                }
              };
            },
            join(subQuery) {
              throw new Error()
            }
          }) as ReturnType<B[typeof key]>;
        }
      }
      const factory = this[dataSym].factoryFun;
      const qb = manager.createQueryBuilder().from(klass, `body`);
      await factory(qb, tools, (ref) => tools.getNode(ref(queryColumns)[dataSym].path));
      if (opt) {
        qb.skip(opt.skip);
        qb.take(opt.take);
      }
      // return await qb.getRawMany();
      throw new Error();
    },
  }
  return builder;
}

const r1 = tableQuery(UserRequirementEntity, {
  num: ({ ref }) => ref(e => e.test)
})
  .byProperty((e) => e.num).filter({ lessOrEqual: 1 }).assertNull(null)
  .asSubQuery((e) => e.user);

const r2 = tableQuery(UserEntity, {
  id: ({ ref }) => ref((e) => e.id),
  userEntity: ({ ref }) => ref((e) => e),
  requirementsArrayCount: ({ join }) => join(r1).count(),
  requirementsTestSum: ({ join }) => join(r1).sum(e => e.num),
  name: ({ ref }) => ref(e => e.name),
})
  .byProperty((e) => e.userEntity).filter({ in: [] }).assertNull(null)
  .byProperty((e) => e.requirementsArrayCount).filter({ moreOrEqual: 1 }).assertNull(null)
  .byProperty((e) => e.name).sort('DESC').setNullOn(null)



