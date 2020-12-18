import { CudrBaseEntity } from "./CudrBase.entity";
import { Type } from "@nestjs/common";
import { ID } from "@/utils/entity";
import { EntityManager, SelectQueryBuilder, getMetadataArgsStorage } from "typeorm";
import { UserRequirementEntity, UserEntity } from "@/entities";
import { getPathStrArray } from "@/utils/getPathStrArray";
import { CustomerError } from "@/customer-error";

const typeSym = Symbol();
const isArraySym = Symbol();
const isNullSym = Symbol();

type Cover<T1, cudrNull extends boolean, cudrArray extends boolean,
  T2 = cudrNull extends true ? T1 | null : T1,
  T3 = cudrArray extends true ? T1[] : T2,
  > = T3
interface WrapperType<T, cudrNull extends boolean, cudrArray extends boolean> {
  [typeSym]: T,
  [isArraySym]: cudrArray,
  [isNullSym]: cudrNull,
}

type Wrapper<T extends CudrBaseEntity, cudrNull extends boolean, cudrArray extends boolean> = {
  [key in keyof T]
  : T[key] extends Function ? never
  : T[key] extends CudrBaseEntity ? Wrapper<T[key], cudrNull, cudrArray>
  : T[key] extends CudrBaseEntity | null | undefined ? Exclude<T[key], null | undefined> extends CudrBaseEntity ? Wrapper<Exclude<T[key], null | undefined>, true, cudrArray> : never
  : T[key] extends Array<infer X> ? X extends CudrBaseEntity ? Wrapper<X, cudrNull, true> : WrapperType<X, cudrNull, true>
  : WrapperType<T[key], cudrNull, cudrArray>
}

type Filter<T> = T extends ID ? { in: T[] }
  : T extends Date ? { lessOrEqual: Date } | { moreOrEqual: Date } | { lessOrEqual: Date, moreOrEqual: Date }
  : T extends number ? { lessOrEqual: number } | { moreOrEqual: number } | { lessOrEqual: number, moreOrEqual: number }
  : T extends string ? { like: string } | { equal: string } | { in: string[] }
  : T extends boolean ? { equal: boolean }
  : T extends CudrBaseEntity ? { in: T['id'][] }
  : never;

const columnSym = Symbol();
interface Column<T, cudrNull extends boolean, cudrArray extends boolean> {
  [columnSym]: WrapperType<T, cudrNull, cudrArray>
}

interface JoinWhat<B extends TableQueryBody<any>> {
  count(): Column<number, false, false>
  count(path: (resultColumns: QueryResultColumns<B>) => Column<any, false, false>): Column<number, false, false>
  sum(path: (resultColumns: QueryResultColumns<B>) => Column<number, false, false>): Column<number, false, false>
}

interface QueryFuns<E extends CudrBaseEntity> {
  ref<T, isNull extends boolean>(
    path: (entity: Wrapper<E, false, false>) => T extends CudrBaseEntity ? Wrapper<T, isNull, false> : WrapperType<T, isNull, false>
  ): Column<T, isNull, false>
  join<T extends CudrBaseEntity, B extends TableQueryBody<T>>(
    subQuery: SubTableQuery<T, B, E>
  ): JoinWhat<B> & Column<QueryResult<B>, false, true>
}

type TableQueryBody<E extends CudrBaseEntity<any>> = {
  [key: string]: (funs: QueryFuns<E>) => Column<any, any, any>
}
type QueryResultColumns<T extends TableQueryBody<any>> = {
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

const SubTableQueryKlassSym = Symbol();
const SubTableQueryBodySym = Symbol();
const SubTableQueryOutTypeSym = Symbol();

type SubTableQuery<E extends CudrBaseEntity, B extends TableQueryBody<E>, O extends CudrBaseEntity> = {
  [SubTableQueryKlassSym]: E
  [SubTableQueryBodySym]: B
  [SubTableQueryOutTypeSym]: O
}

interface TableQueryBuilder<E extends CudrBaseEntity, B extends TableQueryBody<E>> {
  byProperty<T, isNull extends boolean>(path: (resultColumns: QueryResultColumns<B>) => Column<T, isNull, false>): {
    filter(filter: Filter<T> | null | undefined): {
      assertNull(value: boolean | null | undefined): TableQueryBuilder<E, B>
    }
    sort(mode: 'desc' | 'asc' | undefined | null): {
      setNullOn(allow: 'first' | 'last' | null | undefined): TableQueryBuilder<E, B>
    }
  }
  byArray<T>(path: (resultColumns: QueryResultColumns<B>) => Column<T, false, true>): {
    filter: (mode: 'isEmpty' | 'notEmpty' | undefined | null) => TableQueryBuilder<E, B>
  }
  query(manager: EntityManager, opts?: {
    skip?: number,
    take?: number,
  }): Promise<QueryResult<B>[]>;
  asSubQuery<T extends CudrBaseEntity>(joinPath: (e: Wrapper<E, false, false>) => Wrapper<T, any, false>): SubTableQuery<E, B, T>
}

function builderAppend<B extends TableQueryBuilder<any, any>>(
  builder: B,
  appendFun: (qb: SelectQueryBuilder<any>) => Promise<void>,
): B {
  const superFun = Reflect.getOwnMetadata(builderAppend, builder) || (() => { });
  const newBuilder = { ...builder };
  Reflect.defineMetadata(builderAppend, async (qb: SelectQueryBuilder<any>) => {
    await superFun(qb);
    await appendFun(qb)
  }, newBuilder);
  return newBuilder;
}

export type RefNode<T extends CudrBaseEntity> = {
  [key in keyof T]?: T[key] extends CudrBaseEntity ? RefNode<T[key]> : {};
}

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
  function buildRelationTree(strArray: string[]) {
    let currentNode: RefNode<any> = relationTree;
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
    getNode(path: (obj: any) => any): RefNode<any> {
      const pathStrArray = getPathStrArray(path);
      buildRelationTree(pathStrArray);
      return path(relationTree);
    },
    markSelect(path: (obj: any) => any) {
      const targetNode = this.getNode(path);
      const klass = klassMap.get(targetNode)!;
      if (this.isTable(targetNode)) {
        storage.filterColumns(klass).forEach((col) => {
          const pathStrArray = getPathStrArray(path);
          pathStrArray.push(col.propertyName);
          buildRelationTree(pathStrArray);
          selectMarkMap.set(path(relationTree)[col.propertyName], true);
        });
      } else {
        selectMarkMap.set(path(relationTree), true);
      }
    },
  }
}

export function tableQuery<E extends CudrBaseEntity, B extends TableQueryBody<E>>(klass: Type<E>, body: B) {
  const tools = createTools(klass);
  for (const key in body) {
    if (body.hasOwnProperty(key)) {
      const element = body[key];
      element({
        ref(path) {
          tools.markSelect(path);
          return {} as any;
        },
        join() {
          throw new Error()
        }
      })
    }
  }
  const builder: TableQueryBuilder<E, B> = {
    byProperty(path) {
      return {
        filter(filter) {
          return {
            assertNull(assert) {
              return builderAppend(builder, async (qb) => {
                const node = tools.getNode(path);
                if (tools.isTable(node)) {
                  const lastNode = tools.getParent(node);
                  if (filter) {
                    if ('in' in filter) {

                    }
                    if ('equal' in filter) {

                    }
                  }
                } else {
                  if (filter) {
                    if ('in' in filter) {

                    }
                    if ('lessOrEqual' in filter) {

                    }
                    if ('moreOrEqual' in filter) {

                    }
                    if ('like' in filter) {

                    }
                    if ('equal' in filter) {

                    }
                  }

                }
              });
            }
          }
        },
        sort(mode) {
          return {
            setNullOn(mode) {
              return builderAppend(builder, async (qb) => {

              });
            }
          }
        }
      }
    },
    byArray(pathFun) {
      const pathStrArray = getPathStrArray(pathFun);
      return {
        filter(mode) {
          return builder;
        }
      }
    },
    asSubQuery(joinPath) {
      throw new Error();
    },
    async query(manager, opt): Promise<QueryResult<B>[]> {
      const factory = Reflect.getOwnMetadata(builderAppend, this) || (() => { });
      const qb = manager.createQueryBuilder().from(klass, `body`);
      await factory(qb);
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
  .byProperty((e) => e.name).sort('desc').setNullOn(null)



