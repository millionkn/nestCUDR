import { Type, Controller, Post, Body, ForbiddenException } from "@nestjs/common";
import { CudrBaseEntity, loadCudrMetadata, useTransformerTo, loadTransformerFrom, ID } from "./cudr.module";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, SelectQueryBuilder, Brackets, WhereExpression } from "typeorm";

export type WhereOption<T extends CudrBaseEntity> = {
  [key in Extract<keyof T, string>]?
  : T[key] extends ID ? { ''?: { type: 'in', value: string[] } }
  : T[key] extends CudrBaseEntity ? WhereOption<T[key]> & { ''?: { type: 'nullable', value: boolean } }
  : T[key] extends string ? { ''?: { sortIndex?: number } & ({ type: 'like', value: string } | { type: 'equal', value: string }) }
  : T[key] extends number ? { ''?: { sortIndex?: number } & ({ type: 'between', lessOrEqual: number, moreOrEqual: number }) }
  : T[key] extends Date ? { ''?: { sortIndex?: number } & ({ type: 'between', lessOrEqual: string, moreOrEqual: string }) }
  : never
}
export class ResolveError extends Error { }
function* resolveObjectEmptyKey(
  klass: Type<any>,
  object: any,
  alias: string,
): Generator<{
  subKlass: Type<any> | typeof Symbol;
  alias: string;
  key: string;
  index: number;
  bodyValue: any;
  length: number;
}, void, undefined> {
  let { privateColumns } = loadCudrMetadata(klass);
  let index = 0;
  for (const key in object) {
    if (key === '') { continue }
    if (privateColumns.includes(key)) { throw new ForbiddenException() }
    const bodyValue = object[key];
    const subKlass = Reflect.getMetadata('design:type', klass.prototype, key);
    if (typeof bodyValue !== 'object' || bodyValue === null) {
      throw new ResolveError(`${alias}_${key}:必须为对象 或 未定义键${key}`);
    }
    if (subKlass.prototype instanceof CudrBaseEntity) {
      yield { subKlass, alias, key, index, bodyValue: bodyValue[''], length: alias.split('_').length }
      const child = resolveObjectEmptyKey(subKlass, bodyValue, `${alias}_${index}`);
      let { value } = child.next();
      while (value) {
        yield value;
        value = child.next().value;
      }
    } else {
      if ('' in bodyValue) {
        yield { subKlass, alias, key, index, bodyValue: bodyValue[''], length: alias.split('_').length }
      } else {
        throw new ResolveError(`${alias}_${key}:基本类型键的值必须有空白键`);
      }
    }
    index += 1;
  }
}
function resolveJoinSelect<T extends CudrBaseEntity>(
  klass: Type<T>,
  where: any,
  alias: string,
  out: {
    qb: SelectQueryBuilder<any>,
  }
) {
  [...resolveObjectEmptyKey(klass, where, alias)].forEach(({ subKlass, alias, key, index }) => {
    if (subKlass.prototype instanceof CudrBaseEntity) {
      out.qb.leftJoinAndSelect(`${alias}.${key}`, `${alias}_${index}`)
    }
  })
}
function resolveOrder<T extends CudrBaseEntity>(
  klass: Type<T>,
  where: any,
  alias: string,
  out: {
    qb: SelectQueryBuilder<any>,
  }
) {
  const orderArr = new Array<{ index: number, str: string }>();
  [...resolveObjectEmptyKey(klass, where, alias)].forEach(({ bodyValue, alias, key }) => {
    if (undefined === bodyValue) { return }
    if (typeof bodyValue.sortIndex !== 'number') { return }
    orderArr.push({
      index: bodyValue.sortIndex,
      str: `${alias}.${key}`,
    });
  })
  orderArr.sort((a, b) => Math.abs(a.index) - Math.abs(b.index)).forEach((x) => out.qb.addOrderBy(`${x.str}`, x.index >= 0 ? 'ASC' : 'DESC'));
}
function resolveWhere<T extends CudrBaseEntity>(
  klass: Type<T>,
  where: any,
  alias: string,
  out: {
    qw: WhereExpression,
  }
) {
  const infos = [...resolveObjectEmptyKey(klass, where, alias)];
  function xx(length: number): Array<[string, any] | Brackets> {
    const whereArr = new Array<[string, any] | Brackets>();
    while (infos.length > 0) {
      const current = infos[0];
      if (current.length < length) { break }
      if (current.length > length) {
        whereArr.push(...xx(current.length))
      } else {
        infos.shift();
        const { subKlass: klass, alias, key, bodyValue } = current;
        if (bodyValue === undefined) { continue }
        if (!('type' in bodyValue)) { continue }
        if (klass.prototype instanceof CudrBaseEntity) {
          if (bodyValue.type === 'nullable') {
            if (bodyValue.value) {
              const next = infos[0];
              if (next && next.length > length) {
                const childArr = xx(next.length)
                if (childArr.length > 0) {
                  whereArr.push(new Brackets((qw) => {
                    qw.andWhere(new Brackets((qw) => {
                      childArr.forEach((child) => child instanceof Array ? qw.andWhere(...child) : qw.andWhere(child))
                    }))
                    qw.orWhere(`${alias}.${key} is null`)
                  }))
                }
              }
            } else {
              whereArr.push([`${alias}.${key} is not null`, {}])
            }
            continue
          }
        } else if (klass === Symbol) {
          if (bodyValue.type === 'in') {
            whereArr.push([`${alias}.${key} in (:...value)`, { value: bodyValue.value }])
            continue
          }
        } else {
          const from = loadTransformerFrom(klass.prototype).get(key) || ((x) => x);
          if (klass.prototype instanceof Date) {
            if (bodyValue.type === 'between') {
              whereArr.push([
                `${alias}.${key} between :more and :less`,
                {
                  more: from(bodyValue.moreOrEqual),
                  less: from(bodyValue.lessOrEqual)
                }
              ])
              continue
            }
          } else if (klass.prototype instanceof Number) {
            if (bodyValue.type === 'between') {
              whereArr.push([
                `${alias}.${key} between :more and :less`,
                {
                  more: from(bodyValue.moreOrEqual),
                  less: from(bodyValue.lessOrEqual)
                },
              ])
              continue
            }
          } else if (klass.prototype instanceof String) {
            if (bodyValue.type === 'like') {
              whereArr.push([`${alias}.${key} like :value`, { value: `%${from(bodyValue.value)}%` }])
              continue
            }
          }
        }
        throw new ResolveError(`unknown type`);
      }
    }
    return whereArr;
  }
  if (infos.length > 0) { xx(infos[0].length).forEach((child) => child instanceof Array ? out.qw.andWhere(...child) : out.qw.andWhere(child)) }
}

export function createCudrController<T extends CudrBaseEntity>(klass: Type<T>) {
  const { cudrOpt, entityName } = loadCudrMetadata(klass)
  @Controller(`cudr/${entityName}`)
  class CudrController {
    @InjectRepository(klass)
    repository!: Repository<T>
    @Post('findEntityList')
    async findEntityList(@Body() body: {
      where: WhereOption<T>,
      pageIndex?: number,
      pageSize?: number,
    }) {
      const qb = this.repository.createQueryBuilder(`body`)
      if (typeof body.pageSize === 'number') {
        qb.take(body.pageSize);
        if (typeof body.pageIndex === 'number') {
          qb.skip((body.pageIndex - 1) * body.pageSize)
        }
      }
      resolveWhere(klass, body.where, `body`, { qw: qb });
      resolveOrder(klass, body.where, `body`, { qb });
      resolveJoinSelect(klass, body.where, `body`, { qb });
      const [selectResult, total] = await qb.getManyAndCount();
      useTransformerTo(klass, selectResult);
      return {
        data: selectResult,
        total,
      };
    }
  }
  let controllerKlass = eval(`class ${entityName}CudrController extends CudrController{};${entityName}CudrController`);
  return controllerKlass;
}