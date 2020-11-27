import { CudrBaseEntity } from "../CudrBase.entity";
import { Type, BadRequestException } from "@nestjs/common";
import { Brackets, SelectQueryBuilder, WhereExpression } from "typeorm";
import * as dayjs from 'dayjs';
import { ID } from "src/utils/entity";
import { loadDecoratorData, isDecorated } from "src/utils/decorator";
import { DeepQuery, QueryType } from "../decorators";

export type QueryOption<T extends CudrBaseEntity<any>, K = any> = {
  [key in Extract<keyof T, string>]?
  : T[key] extends ID<any> ? { ''?: { ''?: K, in?: T['id'][] } }
  : T[key] extends CudrBaseEntity<any> ? QueryOption<T[key], K> & { ''?: { ''?: K, isNull?: boolean } }
  : T[key] extends Array<infer X> ? X extends CudrBaseEntity<any> ? QueryOption<X, K> & { ''?: { ''?: K, isEmpty?: boolean } } : never
  : T[key] extends Date ? { ''?: { ''?: K, lessOrEqual?: string, moreOrEqual?: string } }
  : T[key] extends string ? { ''?: { ''?: K, like?: string[] | string, equal?: string, in?: string[] } }
  : T[key] extends number ? { ''?: { ''?: K, lessOrEqual?: number, moreOrEqual?: number } }
  : T[key] extends boolean ? { ''?: { ''?: K, equal: boolean } }
  : never
}

export type MetaContext<T = any> = {
  userMeta: T,
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
        let metaTarget = `${alias}.${key}`;
        qb.leftJoinAndSelect(`${alias}.${key}`, `${alias}_${index}`);
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
      const subKlass = isDecorated(QueryType, klass, key) ? loadDecoratorData(QueryType, klass, key).type : Reflect.getMetadata('design:type', klass.prototype, key)
      if (meta === undefined) { return }
      if (typeof meta !== 'object' || meta === null) { throw new BadRequestException(`${klass.name}#${key}#''不正确`) }
      const valueKey = `${alias}_${index}_value`;
      if (subKlass === ID) {
        if (meta.in instanceof Array) {
          if (meta.in.length === 0) {
            whereFun((qb) => qb.andWhere(`1=2`));
          } else {
            whereFun((qb) => qb.andWhere(`${alias}.${key} in (:...${valueKey})`, { [valueKey]: meta.in }));
          }
        }
      } else if (subKlass === Boolean) {
        if (typeof meta.equal === 'boolean') {
          whereFun((qb) => qb.andWhere(`${alias}.${key} = :${valueKey}`, { [valueKey]: meta.equal }));
        }
      } else if (subKlass === String) {
        if (typeof meta.like === 'string') {
          whereFun((qb) => qb.andWhere(`${alias}.${key} like :${valueKey}`, { [valueKey]: `%${meta.like}%` }));
        } else if (meta.like instanceof Array && meta.like.length > 0) {
          const likes: any[] = meta.like;
          whereFun((qb) => likes.forEach((str: string, i: number) => qb.andWhere(`${alias}.${key} like :${valueKey}_index_${i}`, { [`${valueKey}_index_${i}`]: `%${str}%` })));
        } else if (meta.in instanceof Array) {
          if (meta.in.length === 0) {
            whereFun((qb) => qb.andWhere(`1=2`));
          } else {
            whereFun((qb) => qb.andWhere(`${alias}.${key} in (:...${valueKey})`, { [valueKey]: meta.in }));
          }
        } else if (typeof meta.equal === 'string') {
          whereFun((qb) => qb.andWhere(`${alias}.${key} = :${valueKey}`, { [valueKey]: meta.equal }));
        }
      } else if (subKlass === Number) {
        if (typeof meta.lessOrEqual === 'number') {
          whereFun((qb) => qb.andWhere(`${alias}.${key} <= :${valueKey}_less`, {
            [`${valueKey}_less`]: meta.lessOrEqual,
          }));
        }
        if (typeof meta.moreOrEqual === 'number') {
          whereFun((qb) => qb.andWhere(`${alias}.${key} >= :${valueKey}_more`, {
            [`${valueKey}_more`]: meta.moreOrEqual,
          }));
        }
      } else if (subKlass === Date) {
        if (typeof meta.lessOrEqual === 'string') {
          const less = dayjs(meta.lessOrEqual, 'YYYY-MM-DD HH:mm:ss').startOf('second').toDate();
          whereFun((qb) => qb.andWhere(`${alias}.${key} <= :${valueKey}_less`, {
            [`${valueKey}_less`]: less,
          }));
        }
        if (typeof meta.moreOrEqual === 'string') {
          const more = dayjs(meta.moreOrEqual, 'YYYY-MM-DD HH:mm:ss').endOf('second').toDate();
          whereFun((qb) => qb.andWhere(`${alias}.${key} >= :${valueKey}_more`, {
            [`${valueKey}_more`]: more,
          }));
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

export function jsonQuery<T extends CudrBaseEntity<any>, K>(
  qb: SelectQueryBuilder<T>,
  alias: string,
  klass: Type<T>,
  body: QueryOption<T, K>,
) {
  const arr: MetaContext<K>[] = [];
  buildQuery(klass, body, alias, (cb) => cb(qb), qb, (opt) => arr.push(opt));
  return arr;
}