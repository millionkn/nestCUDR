import { CudrBaseEntity } from "./CudrBase.entity";
import { Type } from "@nestjs/common";
import { ID } from "@/utils/entity";
import { EntityManager, SelectQueryBuilder, getMetadataArgsStorage } from "typeorm";
import { UserRequirementEntity, UserEntity } from "@/entities";
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

interface ColumnPoint<T, cudrNull extends boolean, cudrArray extends boolean> {
  [typeSym]?: {
    name: 'ColumnPoint',
    type: T,
    isArray: cudrArray,
    isNull: cudrNull,
  },
}

interface QueryFuns<Entity extends CudrBaseEntity> {
  ref<T, isNull extends boolean, isArray extends boolean>(
    path: (entity: WrapperEntity<Entity, false, false> & WrapperPoint<Entity, false, false>) => WrapperPoint<T, isNull, isArray>
  ): ColumnPoint<T, isNull, isArray>
  join<E extends CudrBaseEntity, Body extends TableQueryBody<E>>(
    subQuery: SubTableQuery<E, Body, Entity>
  ): ColumnPoint<QueryResult<Body>, false, true> & {
    count(): ColumnPoint<number, false, false>
    count<T>(
      path: (body: Body) => (funs: QueryFuns<E>) => ColumnPoint<T, boolean, boolean>,
    ): ColumnPoint<number, false, false>
    sum(
      path: (body: Body) => (funs: QueryFuns<E>) => ColumnPoint<number, false, false>,
    ): ColumnPoint<number, false, false>
    ref<T>(
      path: (body: Body) => (funs: QueryFuns<E>) => ColumnPoint<T, boolean, boolean>,
    ): ColumnPoint<T, false, true>
  }
}

type TableQueryBody<Entity extends CudrBaseEntity<any>> = {
  [key: string]: (funs: QueryFuns<Entity>) => ColumnPoint<any, boolean, boolean>
}

export type Simple<Entity extends CudrBaseEntity> = {
  [key in {
    [key in keyof Entity]: Entity[key] extends null | undefined | infer X
    ? X extends CudrBaseEntity ? never
    : X extends CudrBaseEntity[] ? never
    : key
    : never
  }[keyof Entity]]: Entity[key]
}
type QueryResult<Body extends TableQueryBody<any>> = {
  [key in keyof Body]: ReturnType<Body[key]> extends WrapperPoint<infer T, infer isNull, infer isArray> ?
  T extends CudrBaseEntity ? Cover<Simple<T>, isNull, isArray> : Cover<T, isNull, isArray>
  : never
}

type SubTableQuery<Entity extends CudrBaseEntity, Body extends TableQueryBody<Entity>, Out extends CudrBaseEntity> = {
  [typeSym]?: {
    name: 'subQuery'
    klass: Entity
    body: Body,
    outType: Out,
  }
}

interface TableQueryBuilder<Entity extends CudrBaseEntity, Body extends TableQueryBody<Entity>> {
  [dataSym]: {
    factoryFun: (
      qb: SelectQueryBuilder<any>,
      tools: QueryTools,
    ) => Promise<void>,
  },
  byProperty<T, isNull extends boolean>(path: (body: Body) => (funs: QueryFuns<Entity>) => ColumnPoint<T, isNull, false>): {
    filter(filter: Filter<T> | null | undefined): {
      assertNull(value: boolean | null | undefined): TableQueryBuilder<Entity, Body>
    }
    sort(sortMode: 'DESC' | 'ASC' | undefined | null): {
      setNullOn(nullMode: "NULLS FIRST" | "NULLS LAST" | null | undefined): TableQueryBuilder<Entity, Body>
    }
  }
  byArray<T>(path: (body: Body) => (funs: QueryFuns<Entity>) => ColumnPoint<T, false, true>): {
    filter: (mode: 'isEmpty' | 'notEmpty' | undefined | null) => TableQueryBuilder<Entity, Body>
  }
  query(manager: EntityManager, opts?: {
    skip?: number,
    take?: number,
  }): Promise<QueryResult<Body>[]>;
  asSubQuery<T extends CudrBaseEntity>(
    joinPath: (e: Wrapper<Entity, false, false>) => Wrapper<T, boolean, false>,
  ): SubTableQuery<Entity, Body, T>
}

function builderAppend<Builder extends TableQueryBuilder<any, any>>(
  builder: Builder,
  appendFun: (
    qb: SelectQueryBuilder<any>,
    tools: QueryTools,
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

type LeafNode<T> = {
  [typeSym]?: {
    name: 'RelationLeaf',
    type: T,
  }
}

type RelationNode<T extends CudrBaseEntity> = {
  [key in keyof T]?: T[key] extends CudrBaseEntity ? RelationNode<T[key]> : LeafNode<T[key]>;
}

type QueryTools = ReturnType<typeof createTools>;
const getNodeSym = Symbol();
function createTools<Entity extends CudrBaseEntity>(klass: Type<Entity>) {
  const storage = getMetadataArgsStorage();
  let tableIndex = 0;
  const rootRelationNode = {} as RelationNode<Entity>;
  const klassMap = new Map<RelationNode<CudrBaseEntity>, Type<CudrBaseEntity>>();
  klassMap.set(rootRelationNode, klass);
  const aliasMap = new Map<RelationNode<CudrBaseEntity>, string>();
  aliasMap.set(rootRelationNode, `table_${tableIndex++}`);
  const parentNodeMap = new Map<RelationNode<CudrBaseEntity> | LeafNode<any>, RelationNode<CudrBaseEntity>>();
  const selectMarkMap = new Map<RelationNode<CudrBaseEntity> | LeafNode<any>, true>();
  const keyMap = new Map<RelationNode<CudrBaseEntity> | LeafNode<any>, string>();
  function isRelationNode<T extends CudrBaseEntity>(node: RelationNode<T> | LeafNode<any>): node is RelationNode<T> {
    return klassMap.has(node as any);
  }
  function createRelationNodeProxy<T extends CudrBaseEntity>(node: RelationNode<T> | LeafNode<any>, stack: string[]): Required<RelationNode<T>> {
    return new Proxy<any>(node, {
      has() { return true; },
      get(currentNode: RelationNode<T> | LeafNode<any>, key: Extract<keyof typeof currentNode, string>) {
        if (key === getNodeSym) { return currentNode; }
        if (currentNode[key]) { return createRelationNodeProxy(currentNode[key] as any, [...stack, key]); }
        if (!isRelationNode(currentNode)) { throw new CustomerError(`${stack.join('->')}不存在`); }
        const currentKlass = klassMap.get(currentNode)!;
        const column = storage.filterColumns(currentKlass).find((col) => col.propertyName === key);
        const relation = storage.filterRelations(currentKlass).find((relation) => relation.propertyName === key);
        const nextNode = {};
        if (relation) {
          const target = relation.target;
          if (!(typeof target === 'function')) {
            throw new Error(`${stack.join('->')}关系必须使用Class进行标记`);
          }
          currentNode[key] = nextNode as any;
          klassMap.set(nextNode, target as Type<any>);
          aliasMap.set(nextNode, `table_${tableIndex++}`);
          parentNodeMap.set(nextNode, currentNode);
          keyMap.set(nextNode, key)
        } if (column) {
          currentNode[key] = nextNode as any;
          parentNodeMap.set(nextNode, currentNode);
          keyMap.set(nextNode, key)
        } else {
          throw new CustomerError(`${stack.join('->')}不存在`);
        }
        return createRelationNodeProxy(nextNode, [...stack, key]);
      }
    });
  }
  let paramsIndex = 0;
  return {
    isTable(node: RelationNode<CudrBaseEntity> | LeafNode<any>): node is RelationNode<CudrBaseEntity> {
      return isRelationNode(node);
    },
    isIdNode(node: RelationNode<CudrBaseEntity> | LeafNode<any>) {
      return this.getKey(node) === 'id';
    },
    getKlass(node: RelationNode<CudrBaseEntity>) {
      return klassMap.get(node)!;
    },
    getKey(node: RelationNode<CudrBaseEntity> | LeafNode<any>) {
      return keyMap.get(node)!;
    },
    getAlias(node: RelationNode<CudrBaseEntity>) {
      return aliasMap.get(node)!;
    },
    getParent(node: RelationNode<CudrBaseEntity> | LeafNode<any>) {
      return parentNodeMap.get(node);
    },
    getNode<T>(path: (entity: WrapperEntity<Entity, false, false>) => WrapperPoint<T, boolean, boolean>): T extends CudrBaseEntity ? RelationNode<T> : LeafNode<T> {
      const proxy: any = createRelationNodeProxy(rootRelationNode, ['()']);
      const lastProxy: any = path(proxy);
      return lastProxy[getNodeSym];
    },
    markSelect(node: RelationNode<CudrBaseEntity> | LeafNode<any>) {
      if (this.isTable(node)) {
        const klass = klassMap.get(node)!;
        storage.filterColumns(klass).forEach((colMeta) => {
          const proxy: any = createRelationNodeProxy(node, ['()']);
          const targetNode = proxy[colMeta.propertyName][getNodeSym]
          selectMarkMap.set(targetNode, true);
        });
      } else {
        selectMarkMap.set(node, true);
      }
    },
    generateParamAlias() {
      return `params_${paramsIndex++}`;
    },
    rowCoverArray: new Array<(row: any, out: any) => void>(),
    getAccessors(node: LeafNode<any>) {
      const parent1 = this.getParent(node);
      if (parent1) {
        if (this.isIdNode(node)) {
          const parent2 = this.getParent(parent1);
          if(parent2){

          }else{
            return [`${this.getKey(parent1)}Id`]
          }
        } else {
          return [this.getAlias(parent1), this.getKey(node)];
        }
      } else {
        return [this.getKey(node)];
      }
    },
  }
}

export function tableQuery<E extends CudrBaseEntity, Body extends TableQueryBody<E>>(klass: Type<E>, body: Body) {
  const builder: TableQueryBuilder<E, Body> = {
    [dataSym]: {
      factoryFun: async () => { },
    },
    asSubQuery(joinPath) {
      throw new Error();
    },
    async query(manager, opt): Promise<QueryResult<Body>[]> {
      const tools = createTools(klass);
      for (const key in body) {
        if (body.hasOwnProperty(key)) {
          const element = body[key];
          element({
            ref(path) {
              const targetNode = tools.getNode(path);
              tools.markSelect(targetNode);
              const parentNode = tools.getParent(targetNode);
              if (tools.isIdNode(targetNode)) {
                if (!parentNode) {
                  tools.rowCoverArray.push((row, out) => {
                    out[key] = row.id;
                  });
                } else {
                  tools.rowCoverArray.push((row, out) => {
                    out[key] = row[`${tools.getAlias(parentNode)}.${tools.getKey(targetNode)}Id`]
                  });
                }
              } else {
                if (!parentNode) {
                  tools.rowCoverArray.push((row, out) => {
                    out[key] = row[key];
                  });
                } else {
                  tools.rowCoverArray.push((row, out) => {
                    out[key] = row[`${tools.getAlias(parentNode)}.${tools.getKey(targetNode)}`]
                  });
                }
              }
              return {};
            },
            join(subQuery) {
              throw new Error();
            }
          })
        }
      }
      const factory = this[dataSym].factoryFun;
      const qb = manager.createQueryBuilder().from(klass, `body`);
      await factory(qb, tools);
      if (opt) {
        qb.skip(opt.skip);
        qb.take(opt.take);
      }
      throw new Error();
    },
    byProperty(path) {
      return {
        filter(filter: Filter<any> | null | undefined) {
          return {
            assertNull(assert) {
              return builderAppend(builder, async (qb, tools) => {
                const node = tools.getNode(path(body));
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
              return builderAppend(builder, async (qb, tools) => {
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
  .query({} as any, {} as any).then(([x]) => {
  })


