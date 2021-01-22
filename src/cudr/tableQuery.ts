import { CudrBaseEntity } from "./CudrBaseEntity";
import { Type } from "@nestjs/common";
import { EntityManager, SelectQueryBuilder, getMetadataArgsStorage } from "typeorm";
import { CustomerError } from "@/customer-error";
import { ID } from "@/utils/id";

type Cover<T1, cudrNull extends boolean, cudrArray extends boolean,
  T2 = cudrNull extends true ? T1 | null : T1,
  T3 = cudrArray extends true ? T1[] : T2,
  > = T3

const WrapperPointSym = Symbol()
type WrapperPoint<T, cudrNull extends boolean, cudrArray extends boolean> = {
  [WrapperPointSym]: {
    type: T,
    isArray: cudrArray,
    isNull: cudrNull,
  }
}

const BaseWrapperSym = Symbol();
interface BaseWrapper<T, cudrNull extends boolean, cudrArray extends boolean> {
  [BaseWrapperSym]: {
    type: T,
    isArray: cudrArray,
    isNull: cudrNull,
  },
}

type EntityWrapper<T extends CudrBaseEntity, cudrNull extends boolean, cudrArray extends boolean> = {
  [key in keyof T]
  : T[key] extends Function ? never
  : T[key] extends CudrBaseEntity ? Wrapper<T[key], cudrNull, cudrArray>
  : T[key] extends Array<infer X> ? Wrapper<X, cudrNull, true>
  : T[key] extends null | undefined | infer X ? Wrapper<X, true, cudrArray>
  : BaseWrapper<T[key], cudrNull, cudrArray>
}

type Wrapper<T, cudrNull extends boolean, cudrArray extends boolean> = WrapperPoint<T, cudrNull, cudrArray> & (T extends CudrBaseEntity ? EntityWrapper<T, cudrNull, cudrArray> : BaseWrapper<T, cudrNull, cudrArray>);

type Filter<T> = T extends Date ? { lessOrEqual: Date } | { moreOrEqual: Date } | { lessOrEqual: Date, moreOrEqual: Date } | {}
  : T extends number ? { lessOrEqual: number } | { moreOrEqual: number } | { lessOrEqual: number, moreOrEqual: number } | { in: T[] } | { equal: T } | {}
  : T extends string ? { like: string } | { equal: T } | { in: T[] } | {}
  : T extends boolean ? { equal: boolean } | {}
  : T extends ID ? { equal: T } | { in: T[] } | {}
  : {};

const ColumnPointSym = Symbol();
interface ColumnPoint<T, cudrNull extends boolean, cudrArray extends boolean> {
  [ColumnPointSym]?: {
    type: T,
    isNull: cudrNull,
    isArray: cudrArray,
  }
  (qb: SelectQueryBuilder<any>, tools: QueryTools<any>): void
}

interface QueryFuns<Entity extends CudrBaseEntity> {
  ref<T, isNull extends boolean, isArray extends boolean>(
    path: (entity: Wrapper<Entity, false, false>) => WrapperPoint<T, isNull, isArray>
  ): ColumnPoint<T, isNull, isArray>
  join<E extends CudrBaseEntity, Body extends TableQueryBody<E>>(
    subQuery: SubTableQuery<E, Body, Entity>
  ): ColumnPoint<QueryResult<Body>, false, true> & {
    count(): ColumnPoint<number, false, false>
    count<T>(
      path: (body: Body) => (funs: QueryFuns<E>) => ColumnPoint<T, boolean, boolean>,
    ): ColumnPoint<number, false, false>
    sum(
      path: (body: Body) => (funs: QueryFuns<E>) => ColumnPoint<number, boolean, false>,
    ): ColumnPoint<number, false, false>
    max(
      path: (body: Body) => (funs: QueryFuns<E>) => ColumnPoint<number, boolean, false>,
    ): ColumnPoint<number, false, false>
    min(
      path: (body: Body) => (funs: QueryFuns<E>) => ColumnPoint<number, boolean, false>,
    ): ColumnPoint<number, false, false>
    slice<T>(
      skip: number,
      take: number,
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
  [key in keyof Body]: ReturnType<Body[key]> extends ColumnPoint<infer T, infer isNull, infer isArray> ?
  T extends CudrBaseEntity ? Cover<Simple<T>, isNull, isArray> : Cover<T, isNull, isArray>
  : never
}

const SubTableQuerySym = Symbol();
type SubTableQuery<Entity extends CudrBaseEntity, Body extends TableQueryBody<Entity>, Out extends CudrBaseEntity> = {
  [SubTableQuerySym]: {
    klass: Entity
    body: Body,
    outType: Out,
  }
}

interface TableQueryBuilder<Entity extends CudrBaseEntity, Body extends TableQueryBody<Entity>> {
  factory: (
    qb: SelectQueryBuilder<any>,
    tools: QueryTools<Entity>,
  ) => void,
  byProperty<T, isNull extends boolean>(path: (body: Body) => (funs: QueryFuns<Entity>) => ColumnPoint<T, isNull, false>): {
    filter(filter: Filter<T> | null | undefined): {
      assert(value: 'notNull' | 'allowNull' | 'isNull'): TableQueryBuilder<Entity, Body>
    }
    sort(sortMode: 'DESC' | 'ASC' | undefined | null): {
      setNullOn(nullMode: "NULLS FIRST" | "NULLS LAST" | null | undefined): TableQueryBuilder<Entity, Body>
    }
  }
  byArray<T>(path: (body: Body) => (funs: QueryFuns<Entity>) => ColumnPoint<T, boolean, true>): {
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

function builderAppend<Entity extends CudrBaseEntity<any>, Body extends TableQueryBody<Entity>>(
  builder: TableQueryBuilder<Entity, Body>,
  appendFun: (
    qb: SelectQueryBuilder<any>,
    tools: QueryTools<Entity>,
  ) => void,
): TableQueryBuilder<Entity, Body> {
  return {
    ...builder,
    factory: (...args) => {
      builder.factory(...args);
      appendFun(...args);
    },
  };
}

const LeafNodeSym = Symbol();
type LeafNode<T> = {
  [LeafNodeSym]: {
    type: T,
  }
}

type RelationNode<T extends CudrBaseEntity> = {
  [key in keyof T]?: T[key] extends CudrBaseEntity ? RelationNode<T[key]> : LeafNode<T[key]>;
}
interface QueryTools<Entity extends CudrBaseEntity> {
  isTable(node: RelationNode<CudrBaseEntity> | LeafNode<any>): node is RelationNode<CudrBaseEntity<any>>
  isIdNode(node: RelationNode<CudrBaseEntity> | LeafNode<any>): boolean
  getKlass(node: RelationNode<CudrBaseEntity>): Type<CudrBaseEntity<any>>
  getKey(node: RelationNode<CudrBaseEntity> | LeafNode<any>): string
  getAlias(node: RelationNode<CudrBaseEntity>): string
  getParent(node: LeafNode<any>): RelationNode<CudrBaseEntity<any>>
  getParent(node: RelationNode<CudrBaseEntity>): RelationNode<CudrBaseEntity<any>> | undefined
  getParent(node: RelationNode<CudrBaseEntity> | LeafNode<any>): RelationNode<CudrBaseEntity<any>> | undefined
  getNode<T>(path: (entity: Wrapper<Entity, false, false>) => WrapperPoint<T, boolean, boolean>): T extends CudrBaseEntity ? RelationNode<T> : LeafNode<T>
  generateParamAlias(): string
  addSelect<T>(node: LeafNode<T>, callback: (obj: T) => void): void
  addSelect<Entity extends CudrBaseEntity>(node: RelationNode<Entity>, callback: (obj: Entity) => void): void
  build(qb: SelectQueryBuilder<any>): void
}
const getNodeSym = Symbol();

const storage = getMetadataArgsStorage();
function getRelationArgs<E extends CudrBaseEntity>(klass: Type<E>, key: string) {
  const arg = storage.filterRelations(klass).find((relation) => relation.propertyName === key);
  return arg;
}
function getColumnArgs<E extends CudrBaseEntity>(klass: Type<E>, key: string) {
  const arg = storage.filterColumns(klass).find((col) => col.propertyName === key);
  return arg;
}

function createTools<Entity extends CudrBaseEntity>(klass: Type<Entity>): QueryTools<Entity> {

  let tableIndex = 0;
  const rootRelationNode = {} as RelationNode<Entity>;
  const klassMap = new Map<RelationNode<CudrBaseEntity>, Type<CudrBaseEntity>>();
  klassMap.set(rootRelationNode, klass);
  const aliasMap = new Map<RelationNode<CudrBaseEntity>, string>();
  aliasMap.set(rootRelationNode, `table_${tableIndex++}`);
  const parentNodeMap = new Map<RelationNode<CudrBaseEntity> | LeafNode<any>, RelationNode<CudrBaseEntity>>();
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
        const column = getColumnArgs(currentKlass, key);
        const relation = getRelationArgs(currentKlass, key);
        const nextNode = {};
        if (relation) {
          if (!(typeof relation.type === 'function')) {
            throw new Error(`${stack.join('->')}关系必须使用Class进行标记`);
          }
          const target: Type<any> = relation.type();
          currentNode[key] = nextNode as any;
          klassMap.set(nextNode, target);
          aliasMap.set(nextNode, `table_${tableIndex++}`);
          parentNodeMap.set(nextNode, currentNode);
          keyMap.set(nextNode, key)
        } else if (column) {
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
    isTable(node): node is RelationNode<CudrBaseEntity> {
      return isRelationNode(node);
    },
    isIdNode(node) {
      const parentNode = this.getParent(node);
      if (!parentNode) { return false; }
      const klass = this.getKlass(parentNode);
      const key = this.getKey(node);
      const column = getColumnArgs(klass, key);
      const relation = getRelationArgs(klass, key);
      if (column) {
        return !!column.options.primary;
      } else if (relation) {
        return !!relation.options.primary;
      } else {
        throw new Error('未知错误');
      }
    },
    getKlass(node) {
      return klassMap.get(node)!;
    },
    getKey(node) {
      return keyMap.get(node)!;
    },
    getAlias(node) {
      return aliasMap.get(node)!;
    },
    getParent(node: RelationNode<CudrBaseEntity> | LeafNode<any>) {
      const result: any = parentNodeMap.get(node)
      return result;
    },
    getNode(path: any) {
      const proxy = createRelationNodeProxy(rootRelationNode, ['()']);
      const lastProxy = path(proxy);
      return lastProxy[getNodeSym];
    },
    addSelect(node: RelationNode<any> | LeafNode<any>, cb: (obj: any) => void) {
      throw new Error('未实现addSelect')
    },
    generateParamAlias() {
      return `params_${paramsIndex++}`;
    },
    build(qb) {
      throw new Error('未实现build')
    }
  }
}

export function tableQuery<E extends CudrBaseEntity, Body extends TableQueryBody<E>>(klass: Type<E>, body: Body) {
  const builder: TableQueryBuilder<E, Body> = {
    factory: async (qb, tools) => tools.build(qb),
    asSubQuery(joinPath) {
      throw new Error('未实现asSubQuery');
    },
    async query(manager, opt): Promise<QueryResult<Body>[]> {
      const tools = createTools(klass);
      const rootAlias = tools.getAlias(tools.getNode((e) => e));
      const qb = manager.createQueryBuilder().from(klass, rootAlias);

      for (const key in body) {
        if (body.hasOwnProperty(key)) {
          const element = body[key];
          element({
            ref(path) {
              throw new Error('未实现path');
            },
            join(subQuery) {
              throw new Error('未实现join');
            }
          })
        }
      }

      await this.factory(qb, tools);
      if (opt) {
        qb.skip(opt.skip);
        qb.take(opt.take);
      }
      console.log(qb.getQueryAndParameters());
      throw new Error('未实现query');
    },
    byProperty(path) {
      return {
        filter(filter: Filter<any> | null | undefined) {
          return {
            assert(assert) {
              return builderAppend(builder, async (qb, tools) => {
                path(body)({
                  ref(path) {
                    const node = tools.getNode(path);
                    let targetRefStr: string;
                    if (tools.isTable(node)) {
                      const parentNode = tools.getParent(node);
                      targetRefStr = parentNode ? `${tools.getAlias(parentNode)}.${tools.getKey(node)}` : `${tools.getAlias(node)}.id`;
                    } else {
                      const parentNode = tools.getParent(node)!;
                      targetRefStr = `${tools.getAlias(parentNode)}.${tools.getKey(node)}`;
                    }
                    if (assert === 'isNull') {
                      qb.andWhere(`${targetRefStr} is null`)
                    } else if (true) { }
                    if (filter) {
                      if ('in' in filter && filter.in !== undefined && filter.in !== null) {
                        const paramAlias = tools.generateParamAlias();
                        qb.andWhere(`${targetRefStr} in (:...${paramAlias})`, { [paramAlias]: filter.in });
                      }
                      if ('lessOrEqual' in filter && filter.lessOrEqual !== undefined && filter.lessOrEqual !== null) {
                        const paramAlias = tools.generateParamAlias();
                        qb.andWhere(`${targetRefStr} <= :${paramAlias}`, { [paramAlias]: filter.lessOrEqual });
                      }
                      if ('moreOrEqual' in filter && filter.moreOrEqual !== undefined && filter.moreOrEqual !== null) {
                        const paramAlias = tools.generateParamAlias();
                        qb.andWhere(`${targetRefStr} >= :${paramAlias}`, { [paramAlias]: filter.moreOrEqual });
                      }
                      if ('like' in filter && filter.like !== undefined && filter.like !== null) {
                        const paramAlias = tools.generateParamAlias();
                        qb.andWhere(`${targetRefStr} like :${paramAlias}`, { [paramAlias]: filter.like });
                      }
                      if ('equal' in filter && filter.equal !== undefined && filter.equal !== null) {
                        const paramAlias = tools.generateParamAlias();
                        qb.andWhere(`${targetRefStr} = :${paramAlias}`, { [paramAlias]: filter.equal });
                      }
                    }
                    return (qb) => {
                      throw new Error();
                    }
                  },
                  join() {
                    throw new Error('未实现join')
                  }
                })

              });
            }
          }
        },
        sort(sortMode) {
          return {
            setNullOn(nullMode) {
              return builderAppend(builder, async (qb, tools) => {
                path(body)({
                  ref(path) {
                    const node = tools.getNode(path);
                    let targetRefStr: string;
                    if (tools.isTable(node)) {
                      const parentNode = tools.getParent(node);
                      targetRefStr = parentNode ? `${tools.getAlias(parentNode)}.${tools.getKey(node)}` : `${tools.getAlias(node)}.id`;
                    } else {
                      const parentNode = tools.getParent(node)!;
                      targetRefStr = `${tools.getAlias(parentNode)}.${tools.getKey(node)}`;
                    }
                    qb.orderBy(`${targetRefStr}`, sortMode || undefined, nullMode || undefined);
                    return (qb) => {
                      throw new Error();
                    }
                  },
                  join(a) {
                    throw new Error('未实现join')
                  }
                })

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
            throw new Error('未实现builderAppend')
          });
        }
      }
    },
  }
  return builder;
}
