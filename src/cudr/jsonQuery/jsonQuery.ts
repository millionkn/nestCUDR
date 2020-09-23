import { CudrBaseEntity } from "../CudrBase.entity";
import { Type, BadRequestException } from "@nestjs/common";
import { Brackets, SelectQueryBuilder, WhereExpression } from "typeorm";
import * as moment from 'moment';
import { ID } from "src/utils/entity";
import { loadDecoratorData, isDecorated } from "src/utils/decorator";
import { DeepQuery, QueryTag, QueryLast } from "../decorators";

export type QueryOption<T extends CudrBaseEntity<any>> = {
  [key in Extract<keyof T, string>]?
  : T[key] extends ID<any> ? { ''?: { in?: T['id'][] } }
  : T[key] extends CudrBaseEntity<any> ? QueryOption<T[key]> & { ''?: { isNull?: boolean } }
  : T[key] extends Array<infer X> ? X extends CudrBaseEntity<any> ? QueryOption<X> & { ''?: { isEmpty?: boolean } } : never
  : T[key] extends string ? { ''?: { like?: string, equal?: string } }
  : T[key] extends number ? { ''?: { between?: { lessOrEqual: number, moreOrEqual: number } } }
  : T[key] extends Date ? { ''?: { isNull?: boolean, between?: { lessOrEqual: string, moreOrEqual: string } } }
  : T[key] extends boolean ? { ''?: { equal: boolean } }
  : never
}

export type MetaContext = {
  userMeta: any,
  alias: string,
  key: string,
  index: number,
  deep: number,
}

function buildQuery<T extends CudrBaseEntity<any>>(
  klass: Type<T>,
  body: any,
  alias: string,
  whereFun: (cb: (qw: WhereExpression) => void) => void,
  qb: SelectQueryBuilder<any>,
  metaExtra?: (opt: MetaContext) => void,
) {
  const extraFun = metaExtra || (() => { });
  Object.keys(body).forEach((key, index) => {
    if (key === '') { return }
    const subBody = body[key];
    if (typeof subBody !== 'object' || subBody === null) {
      throw new BadRequestException(`${klass.name}#${key}必须是一个对象`)
    }
    const meta = subBody[''];
    if (isDecorated(DeepQuery, klass, key)) {
      const { subKlass, metaArg } = loadDecoratorData(DeepQuery, klass, key)();
      if (metaArg.relationType === 'one-to-one' || metaArg.relationType === 'many-to-one') {
        let metaTarget: string;
        if (isDecorated(QueryLast, klass, key)) {
          const test = loadDecoratorData(QueryLast, klass, key)();
          const otherSide = test.otherSide;
          metaTarget = `${alias}_${index}.${otherSide}`;
          qb.leftJoin((qb) => {
            return qb.subQuery()
              .from(subKlass, `temp_table`)
              .groupBy(`temp_table.${otherSide}`)
              .select(`temp_table.${otherSide}`, `otherSideId`)
              .addSelect(`max(temp_table.createDate)`, `createDate`)
          }, `${alias}_${index}_temp`, `${alias}.id=${alias}_${index}_temp.otherSideId`)
            .leftJoinAndSelect(
              `${alias}.${key}`,
              `${alias}_${index}`,
              `${alias}_${index}.createDate = ${alias}_${index}_temp.createDate and ${alias}_${index}.${otherSide} = ${alias}_${index}_temp.otherSideId`,
            );
        } else {
          metaTarget = `${alias}.${key}`;
          qb.leftJoinAndSelect(`${alias}.${key}`, `${alias}_${index}`);
        }
        if (meta && meta.isNull === true) {
          whereFun((we) => we.andWhere(`${metaTarget} is null`));
        } else if (meta && meta.isNull === false) {
          whereFun((we) => {
            we.andWhere(`${metaTarget} is not null`);
            buildQuery(subKlass, subBody, `${alias}_${index}`, (cb) => cb(we), qb, extraFun);
          });
        } else {
          const whereArr = new Array<(qb: WhereExpression) => void>();
          buildQuery(subKlass, subBody, `${alias}_${index}`, (cb) => whereArr.push(cb), qb, extraFun);
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
        qb.leftJoinAndSelect(`${alias}.${key}`, `${alias}_${index}`);
        if (meta && meta.isEmpty === true) {
          whereFun((qw) => qw.andWhere(`${alias}_${index}.id is null`));
        } else if (meta && meta.isEmpty === false) {
          buildQuery(subKlass, subBody, `${alias}_${index}`, whereFun, qb, (opt) => extraFun({ ...opt, deep: opt.deep + 1 }));
          whereFun((qw) => qw.andWhere(`${alias}_${index}.id is not null`));
        } else {
          const whereArr = new Array<(qb: WhereExpression) => void>();
          buildQuery(subKlass, subBody, `${alias}_${index}`, (cb) => whereArr.push(cb), qb, (opt) => extraFun({ ...opt, deep: opt.deep + 1 }));
          if (whereArr.length !== 0) {
            whereFun((we) => {
              we.andWhere(new Brackets((swe) => {
                swe.where(new Brackets((swe2) => {
                  whereArr.forEach((w) => w(swe2));
                }));
                swe.orWhere(`${alias}_${index}.id is null`);
              }))
            });
          }
        }
      }
    } else {
      const subKlass = isDecorated(QueryTag, klass, key) ? loadDecoratorData(QueryTag, klass, key).type() : Reflect.getMetadata('design:type', klass.prototype, key)
      if (meta === undefined) { return }
      if (typeof meta !== 'object' || meta === null) { throw new BadRequestException(`${klass.name}#${key}#''不正确`) }
      const valueKey = `${alias}_${index}_value`;
      if (subKlass === ID) {
        if (meta.in instanceof Array) {
          whereFun((qb) => qb.andWhere(`${alias}.${key} in (:...${valueKey})`, { [valueKey]: meta.in }));
        }
      } else if (subKlass === Boolean) {
        if (typeof meta.equal === 'boolean') {
          whereFun((qb) => qb.andWhere(`${alias}.${key} = :${valueKey}`, { [valueKey]: meta.equal }));
        }
      } else if (subKlass === String) {
        if (typeof meta.like === 'string') {
          whereFun((qb) => qb.andWhere(`${alias}.${key} like :${valueKey}`, { [valueKey]: `%${meta.like}%` }));
        }
      } else if (subKlass === Number) {
        if (typeof meta.between === 'object' && meta.between !== null) {
          if (typeof meta.between.lessOrEqual === 'number' && typeof meta.between.moreOrEqual === 'number') {
            whereFun((qb) => qb.andWhere(`${alias}.${key} between :${valueKey}_more and :${valueKey}_less`, {
              [`${valueKey}_more`]: meta.between.moreOrEqual,
              [`${valueKey}_less`]: meta.between.lessOrEqual,
            }));
          }
        }
      } else if (subKlass === Date) {
        if (meta.isNull === true) {
          whereFun((qb) => qb.andWhere(`${alias}.${key} is null`));
        } else if (meta.between && typeof meta.between.lessOrEqual === 'string' && typeof meta.between.moreOrEqual === 'string') {
          const less = moment(meta.between.lessOrEqual, 'YYYY-MM-DD HH:mm:ss').startOf('second').toDate();
          const more = moment(meta.between.moreOrEqual, 'YYYY-MM-DD HH:mm:ss').endOf('second').toDate();
          if (meta.isNull === false) {
            whereFun((qb) => qb.andWhere(`${alias}.${key} between :${valueKey}_more and :${valueKey}_less`, {
              [`${valueKey}_more`]: more,
              [`${valueKey}_less`]: less,
            }));
          } else {
            whereFun((qb) => qb.andWhere(`(${alias}.${key} is null or (${alias}.${key} between :${valueKey}_more and :${valueKey}_less))`, {
              [`${valueKey}_more`]: more,
              [`${valueKey}_less`]: less,
            }))
          }
        } else {
          if (meta.isNull === false) {
            whereFun((qb) => qb.andWhere(`${alias}.${key} is not null`));
          }
        }
      } else {
        throw new BadRequestException(`未知的类型:${klass.name}#${key}`);
      }
      if (meta && '' in meta) {
        extraFun({
          userMeta: meta[''],
          alias,
          key,
          index,
          deep: 0,
        });
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
  const arr: MetaContext[] = [];
  buildQuery(klass, body, alias, (cb) => cb(qb), qb, (opt) => arr.push(opt));
  return arr;
}