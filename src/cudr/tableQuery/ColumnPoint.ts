import { NoInterface, Cover } from "./types";
import { SelectQueryBuilder } from "typeorm";

type FilterFun = (where: SelectQueryBuilder<any>['andWhere'], ref: string, tools: { generateParamAlias(): string }) => void;
type OrderFun = (order: SelectQueryBuilder<any>['addOrderBy'], ref: string) => void;

export type ColumnPoint<T, isNull extends boolean, isArray extends boolean> = NoInterface<{
  addFilter(fun: FilterFun): void
  addOrder(fun: OrderFun): void
  buildQuery(qb: SelectQueryBuilder<any>): void
  mapper(raw: any): Cover<T, isNull, isArray>
  isArray(): isArray
}>