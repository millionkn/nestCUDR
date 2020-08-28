import { CudrBaseEntity } from "../CudrBase.entity";
import { ID, loadType } from "src/utils";
import { Type } from "@nestjs/common";
import { Brackets, SelectQueryBuilder, WhereExpression } from "typeorm";
import * as moment from 'moment';
import { isOneToLastOne } from "../RightJoin.decorator";

export type QueryOption<T extends CudrBaseEntity<any>> = {
  [key in Extract<keyof T, string>]?
  : T[key] extends ID<any> ? { ''?: { in?: T['id'][] } }
  : T[key] extends CudrBaseEntity<any> ? QueryOption<T[key]> & { ''?: { isNull?: boolean } }
  : T[key] extends string ? { ''?: { sortIndex?: number, like?: string, equal?: string } }
  : T[key] extends number ? { ''?: { sortIndex?: number, between?: { lessOrEqual: number, moreOrEqual: number } } }
  : T[key] extends Date ? { ''?: { sortIndex?: number, nullable?: boolean, between?: { lessOrEqual: string, moreOrEqual: string } } }
  : T[key] extends boolean ? { ''?: { equal: boolean } }
  : never
}
type sortInfo = { index: number, by: string }
function buildQuery<T extends CudrBaseEntity<any>>(
  klass: Type<T>,
  body: any,
  alias: string,
  whereFun: (cb: (qw: WhereExpression) => void) => void,
  qb: SelectQueryBuilder<any>,
  sortIndexArray: sortInfo[],
) {
  Object.keys(body).forEach((key, index) => {
    if (key === '') { return }
    const subBody = body[key];
    if (typeof subBody !== 'object' || subBody === null) { return }
    const subKlass = loadType(klass.prototype, key);
    if (subKlass === undefined) { return }
    const meta = subBody[''];
    if (subKlass.prototype instanceof CudrBaseEntity) {
      if (meta && meta.isNull === true) {
        whereFun((we) => we.andWhere(`${alias}.${key} is null`));
      } else if (meta && meta.isNull === false) {
        const otherSide = isOneToLastOne(klass.prototype, key);
        if (otherSide === null) {
          qb.leftJoinAndSelect(`${alias}.${key}`, `${alias}_${index}`);
          whereFun((we) => {
            we.andWhere(`${alias}.${key} is not null`);
            buildQuery(subKlass, subBody, `${alias}_${index}`, (cb) => cb(we), qb, sortIndexArray);
          });
        } else {
          qb.leftJoinAndMapOne(`${alias}.${otherSide}`, (qb) => {
            const other = qb.subQuery()
              .from(subKlass, `other`)
              .leftJoin((qb) => qb.subQuery()
                .from(subKlass, `temp`)
                .groupBy(`temp.${otherSide}`)
                .select(`max(temp.createDate)`, `lastdate`)
                .addSelect(`temp.${otherSide}`, `otherId`)
                , `temp`, `temp.otherId = other.id`)
              .having(`temp.lastdate = other.createDate`)
            jsonQuery<any>(other, `other`, subKlass, subBody);
            return other;
          }, `${alias}_${index}`)
        }
      } else {
        qb.leftJoinAndSelect(`${alias}.${key}`, `${alias}_${index}`);
        const whereArr = new Array<(qb: WhereExpression) => void>();
        buildQuery(subKlass, subBody, `${alias}_${index}`, (cb) => whereArr.push(cb), qb, sortIndexArray);
        if (whereArr.length !== 0) {
          whereFun((we) => {
            we.andWhere(new Brackets((swe) => {
              swe.where(new Brackets((swe2) => {
                whereArr.forEach((w) => w(swe2));
              }));
              swe.orWhere(`${alias}.${key} is null`);
            }))
          });
        }
      }
    } else {
      if (typeof meta !== 'object' || meta === null) { return }
      if (subKlass === ID) {
        if (meta.in instanceof Array) {
          whereFun((qb) => qb.andWhere(`${alias}.${key} in (:...value)`, { value: meta.in }));
        }
      } else if (subKlass === Boolean) {
        if (typeof meta.equal === 'boolean') {
          whereFun((qb) => qb.andWhere(`${alias}.${key} = :value`, { value: meta.equal }));
        }
      } else if (subKlass === String) {
        if (typeof meta.like === 'string') {
          whereFun((qb) => qb.andWhere(`${alias}.${key} like :value`, { value: `%${meta.like}%` }));
        }
      } else if (subKlass === Number) {
        if (typeof meta.between === 'object' && meta.between !== null) {
          if (typeof meta.between.lessOrEqual === 'number' && typeof meta.between.moreOrEqual === 'number') {
            whereFun((qb) => qb.andWhere(`${alias}.${key} between :moreOrEqual and :lessOrEqual`, meta.between));
          }
        }
      } else if (subKlass === Date) {
        if (typeof meta.between === 'object' && meta.between !== null) {
          if (typeof meta.between.lessOrEqual === 'string' && typeof meta.between.moreOrEqual === 'string') {
            const less = moment(meta.between.lessOrEqual, 'YYYY-MM-DD HH:mm:ss').toDate();
            const more = moment(meta.between.moreOrEqual, 'YYYY-MM-DD HH:mm:ss').toDate();
            if (meta.nullable === true) {
              whereFun((qb) => qb.andWhere(new Brackets((w) => w.where(`${alias}.${key} between :more and :less`, { less, more }).orWhere(`${alias}.${key} is null`))));
            } else {
              whereFun((qb) => qb.andWhere(`${alias}.${key} between :more and :less`, { less, more }));
            }
          }
        } else {
          if (meta.nullable === false) {
            whereFun((qb) => qb.andWhere(`${alias}.${key} is not null`));
          }
        }
      }
    }
    if (typeof meta.sortIndex === 'number') {
      sortIndexArray.push({
        index: meta.sortIndex,
        by: `${alias}.${key}`,
      })
    }
  });
}

export function jsonQuery<T extends CudrBaseEntity<any>>(
  qb: SelectQueryBuilder<T>,
  alias: string,
  klass: Type<T>,
  body: QueryOption<T>,
) {
  const sortArr: sortInfo[] = []
  buildQuery(klass, body, alias, (cb) => cb(qb), qb, sortArr);
  sortArr.sort((a, b) => Math.abs(a.index) - Math.abs(b.index)).forEach((info) => {
    qb.addOrderBy(info.by, info.index > 0 ? 'ASC' : 'DESC');
  })
}