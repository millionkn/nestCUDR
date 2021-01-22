import { QueryFuns } from "./types";
import { CudrBaseEntity } from "../CudrBaseEntity";
import { Type } from "@nestjs/common";
import { SelectQueryBuilder } from "typeorm";
import { QueryTools } from "./types";
import { SubTableQuery } from "./subTableQuery";

type ColumnTools = {
  generateParamAlias(): string
  firstOrder(value?: boolean): boolean
}

const ColumnPointSym = Symbol();

interface ColumnPointData<T, cudrNull extends boolean, cudrArray extends boolean> {
  [ColumnPointSym]?: {
    type: T,
    isNull: cudrNull,
    isArray: cudrArray,
  }
  addFilter(fun: (qb: SelectQueryBuilder<any>, ref: string, tools: ColumnTools) => void): void
  addSort(fun: (qb: SelectQueryBuilder<any>, ref: string, tools: ColumnTools) => void): void
  asyncDependsOn(): SubTableQuery<any, any, any>
}


export interface ColumnPoint<T, cudrNull extends boolean, cudrArray extends boolean> {
  [ColumnPointSym]: ColumnPointData<T, cudrNull, cudrArray>;
}
export function getColumnPointData<T extends ColumnPoint<any, boolean, boolean>>(columnPoint: T): T[typeof ColumnPointSym] {
  return columnPoint[ColumnPointSym];
}

export function createQueryFuns<Entity extends CudrBaseEntity>(klass: Type<Entity>, queryTools: QueryTools<Entity>): QueryFuns<Entity> {
  return {
    ref(path) {
      return {
        [ColumnPointSym]: {
          addFilter(fun) {
            throw new Error();
          },
          addSort(fun) {
            throw new Error();
          },
          asyncDependsOn() {
            throw new Error();
          }
        }
      }
    },
    join(subQuery) {
      return {
        [ColumnPointSym]: {
          addFilter(fun) {
            throw new Error();
          },
          addSort(fun) {
            throw new Error();
          },
          asyncDependsOn() {
            throw new Error();
          }
        },
        count() {
          return {
            [ColumnPointSym]: {
              addFilter(fun) {
                throw new Error();
              },
              addSort(fun) {
                throw new Error();
              },
              asyncDependsOn() {
                throw new Error();
              }
            },
          }
        },
        countOn() {
          return {
            [ColumnPointSym]: {
              addFilter(fun) {
                throw new Error();
              },
              addSort(fun) {
                throw new Error();
              },
              asyncDependsOn() {
                throw new Error();
              }
            },
          }
        },
        sum() {
          return {
            [ColumnPointSym]: {
              addFilter(fun) {
                throw new Error();
              },
              addSort(fun) {
                throw new Error();
              },
              asyncDependsOn() {
                throw new Error();
              }
            },
          }
        },
        max() {
          return {
            [ColumnPointSym]: {
              addFilter(fun) {
                throw new Error();
              },
              addSort(fun) {
                throw new Error();
              },
              asyncDependsOn() {
                throw new Error();
              }
            },
          }
        },
        min() {
          return {
            [ColumnPointSym]: {
              addFilter(fun) {
                throw new Error();
              },
              addSort(fun) {
                throw new Error();
              },
              asyncDependsOn() {
                throw new Error();
              }
            },
          }
        },
        slice() {
          return {
            [ColumnPointSym]: {
              addFilter(fun) {
                throw new Error();
              },
              addSort(fun) {
                throw new Error();
              },
              asyncDependsOn() {
                throw new Error();
              }
            },
          }
        }
      }
    }
  }
}