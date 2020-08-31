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
  : T[key] extends Date ? { ''?: { sortIndex?: number, isNull?: boolean, between?: { lessOrEqual: string, moreOrEqual: string } } }
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
      let metaTarget: string;
      const otherSide = isOneToLastOne(klass.prototype, key);
      if (otherSide === null) {
        metaTarget = `${alias}.${key}`;
        qb.leftJoinAndSelect(`${alias}.${key}`, `${alias}_${index}`);
      } else {
        metaTarget = `${alias}_${index}.${otherSide}`;
        qb.leftJoin((qb) => {
          return qb.subQuery()
            .from(subKlass, `temp_table`)
            .groupBy(`temp_table.${otherSide}`)
            .select(`temp_table.${otherSide}`, `otherSideId`)
            .addSelect(`max(temp_table.createDate)`, `createDate`)
        }, `${alias}_${index}_temp`, `${alias}.id=${alias}_${index}_temp.otherSideId`)
          .leftJoinAndSelect(`${alias}.${key}`, `${alias}_${index}`, `${alias}_${index}.createDate = ${alias}_${index}_temp.createDate and ${alias}_${index}.${otherSide} = ${alias}_${index}_temp.otherSideId`);
      }
      if (meta && meta.isNull === true) {
        whereFun((we) => we.andWhere(`${metaTarget} is null`));
      } else if (meta && meta.isNull === false) {
        whereFun((we) => {
          we.andWhere(`${metaTarget} is not null`);
          buildQuery(subKlass, subBody, `${alias}_${index}`, (cb) => cb(we), qb, sortIndexArray);
        });
      } else {
        const whereArr = new Array<(qb: WhereExpression) => void>();
        buildQuery(subKlass, subBody, `${alias}_${index}`, (cb) => whereArr.push(cb), qb, sortIndexArray);
        if (whereArr.length !== 0) {
          whereFun((we) => {
            we.andWhere(new Brackets((swe) => {
              swe.where(new Brackets((swe2) => {
                whereArr.forEach((w) => w(swe2));
              }));
              swe.orWhere(`${metaTarget} is null`);
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
        if (meta.isNull === true) {
          whereFun((qb) => qb.andWhere(`${alias}.${key} is null`));
        } else {
          if (typeof meta.between.lessOrEqual === 'string' && typeof meta.between.moreOrEqual === 'string') {
            const less = moment(meta.between.lessOrEqual, 'YYYY-MM-DD HH:mm:ss').startOf('second').toDate();
            const more = moment(meta.between.moreOrEqual, 'YYYY-MM-DD HH:mm:ss').endOf('second').toDate();
            if (meta.isNull === false) {
              whereFun((qb) => qb.andWhere(`${alias}.${key} between :more and :less`, { less, more }));
            } else {
              whereFun((qb) => qb.andWhere(`(${alias}.${key} is null or (${alias}.${key} between :more and :less))`, { less, more }))
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