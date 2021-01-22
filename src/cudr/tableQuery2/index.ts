import { Type } from "@nestjs/common";
import { CudrBaseEntity } from "../CudrBaseEntity";
import { TableQueryBody, TableQueryBuilder, ColumnPointBody, Filter, QueryTools } from "./types";
import { objectMap } from "@/utils/objectMap";
import { createQueryFuns, getColumnPointData } from "./queryFuns";


function createQueryBuilder<Entity extends CudrBaseEntity, Body extends TableQueryBody<Entity>>(
  args: {
    klass: Type<Entity>,
    queryBody: Body,
    factory: (
      columbBody: ColumnPointBody<Body>,
    ) => void,
  }

): TableQueryBuilder<Entity, Body> {
  return {
    byProperty(path) {
      return {
        filter(filter: Filter<any>) {
          return {
            assert(nullValue) {
              return createQueryBuilder({
                ...args,
                factory(columnBody) {
                  args.factory(columnBody);
                  getColumnPointData(path(columnBody)).addFilter((qb, targetRefStr, tools) => {
                    if (nullValue === 'isNull') {
                      qb.andWhere(`${targetRefStr} is null`);
                    } else {
                      if (nullValue === 'notNull') {
                        qb.andWhere(`${targetRefStr} is not null`);
                      }
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
                    }
                  });
                }
              });
            }
          }
        },
        sort(sortMode) {
          return {
            setNullOn(nullMode) {
              return createQueryBuilder({
                ...args,
                factory(columnBody) {
                  args.factory(columnBody);
                  getColumnPointData(path(columnBody)).addSort((qb, ref, tools) => {
                    if (tools.firstOrder()) {
                      qb.orderBy(ref, sortMode || undefined, nullMode || undefined);
                      tools.firstOrder(false);
                    } else {
                      qb.addOrderBy(ref, sortMode || undefined, nullMode || undefined);
                    }
                  });
                }
              });
            }
          }
        }
      }
    },
    byArray(path) {
      return {
        filter(mode) {
          return createQueryBuilder({
            ...args,
            factory(columnBody) {
              const column = getColumnPointData(path(columnBody));
              args.factory(columnBody);
              throw new Error();
            }
          });
        }
      }
    },
    query(manager) {
      const queryTools: QueryTools<Entity> = {
        addColumn() { }
      };
      const funs = createQueryFuns(args.klass, queryTools);
      const columnBody: ColumnPointBody<Body> = objectMap(args.queryBody, (a) => a(funs));
      args.factory(columnBody);
      throw new Error();
    },
    count(manager) {
      const queryTools: QueryTools<Entity> = {
        addColumn() { }
      };
      const funs = createQueryFuns(args.klass, queryTools);
      const columnBody: ColumnPointBody<Body> = objectMap(args.queryBody, (a) => a(funs));
      args.factory(columnBody);
      throw new Error();
    },
    asSubQuery() {
      throw new Error();
    }
  }
}

export function tableQuery<E extends CudrBaseEntity, Body extends TableQueryBody<E>>(klass: Type<E>, queryBody: Body): TableQueryBuilder<E, Body> {
  return createQueryBuilder({
    klass,
    queryBody,
    factory() { },
  });
}