import { Injectable, Type } from "@nestjs/common";
import * as dayjs from "dayjs";
import { BaseEntity } from "src/utils/entity";
import { getRepository } from "typeorm";
import { jsonQuery, QueryOption, MetaContext } from "./jsonQuery/jsonQuery";
import { entityTransformerTo } from "./tools";

export class CudrException extends Error { }

@Injectable()
export class CudrService {
  async findEntityList<T extends BaseEntity>(klass: Type<T>, body: {
    where: QueryOption<T, { sortIndex: number }>,
    pageIndex?: number,
    pageSize?: number,
  }) {
    if (false
      || typeof body !== 'object'
      || typeof body.where !== 'object'
      || body.where === null
    ) {
      throw new CudrException('缺少where')
    }
    const qb = getRepository(klass).createQueryBuilder(`body`);
    const contextArr = jsonQuery(qb, `body`, klass, body.where)
      .filter((context) => typeof context.userMeta.sortIndex === 'number');
    if (undefined !== body.pageIndex) {
      if (body.pageSize === undefined) {
        qb.skip((body.pageIndex - 1) * 15);
        qb.take(15);
      } else {
        qb.skip((body.pageIndex - 1) * body.pageSize);
        qb.take(body.pageSize);
      }
    } else if (undefined !== body.pageSize) {
      qb.take(body.pageSize);
    }
    if (body.pageSize === 0) {
      return {
        data: [],
        total: await qb.getCount()
      }
    } else {
      contextArr.sort((a, b) => a.deep === b.deep ? a.deep - b.deep : Math.abs(a.userMeta.sortIndex) - Math.abs(b.userMeta.sortIndex))
        .forEach((opt) => {
          if (opt.userMeta.sortIndex === 0) { throw new CudrException('sortIndex不能为0') }
          qb.addOrderBy(`${opt.alias}.${opt.key}`, opt.userMeta.sortIndex > 0 ? 'ASC' : 'DESC');
        });
      qb.addOrderBy(`body.createDate`, 'DESC');
      const [selectResult, total] = await qb.getManyAndCount();
      entityTransformerTo(klass, selectResult);
      return {
        data: selectResult,
        total,
      };
    }
  }
  async statistic<T extends BaseEntity>(klass: Type<T>, body: {
    where: QueryOption<T,
      | { alias: string }
      | { time: { lessOrEqual?: string, moreOrEqual?: string }[] | { lessOrEqual?: string, moreOrEqual?: string } }
      | { alias: string, select: 'count' | 'sum' }
    >,
  }) {
    if (false
      || typeof body !== 'object'
      || typeof body.where !== 'object'
      || body.where === null
    ) {
      throw new CudrException('缺少where')
    }
    const qb = getRepository(klass).createQueryBuilder(`body`);
    const contextArr = jsonQuery(qb, `body`, klass, body.where);
    qb.select('1');
    let timeCont: MetaContext<{ time: { lessOrEqual?: string, moreOrEqual?: string }[] | { lessOrEqual?: string, moreOrEqual?: string } }> = contextArr.filter((cont) => 'time' in cont.userMeta)[0] as any;
    timeCont = timeCont || { alias: `body`, key: `createDate`, userMeta: { time: {} } }
    let selectArr: MetaContext<{ alias: string, select: 'count' | 'sum' }>[] = contextArr.filter((cont) => 'select' in cont.userMeta) as any;
    let itemArr: MetaContext<{ alias: string }>[] = contextArr.filter((cont) => 'alias' in cont.userMeta && !('select' in cont.userMeta)) as any;
    const afterFun = new Array<(raw: any, obj: any) => void>();
    itemArr.forEach((cont, index) => {
      qb.addGroupBy(`${cont.alias}.${cont.key}`);
      qb.addSelect(`${cont.alias}.${cont.key}`, `item_${index}`);
      afterFun.push((raw, obj) => {
        obj[cont.userMeta.alias] = raw[`item_${index}`];
      });
    });
    const timeIsArray = timeCont.userMeta.time instanceof Array;
    selectArr.forEach((cont, selectIndex) => {
      const sqlFunc = cont.userMeta.select;
      (timeCont.userMeta.time instanceof Array ? timeCont.userMeta.time : [timeCont.userMeta.time]).forEach((t, timeIndex) => {
        let onFalse: string;
        if (sqlFunc === 'count') {
          onFalse = 'null';
          afterFun.push((raw, obj) => {
            const result = Number.parseInt(raw[`result_${selectIndex}_time_${timeIndex}`]);
            if (timeIsArray) {
              const arr = obj[cont.userMeta.alias] = obj[cont.userMeta.alias] || [];
              arr.push(result);
            } else {
              obj[cont.userMeta.alias] = result;
            }
          });
        } else if (sqlFunc === 'sum') {
          onFalse = '0';
          afterFun.push((raw, obj) => {
            const result = Number.parseFloat(raw[`result_${selectIndex}_time_${timeIndex}`]);
            if (timeIsArray) {
              const arr = obj[cont.userMeta.alias] = obj[cont.userMeta.alias] || [];
              arr.push(result);
            } else {
              obj[cont.userMeta.alias] = result;
            }
          });
        } else {
          throw new CudrException(`无效的select:${sqlFunc}`);
        }
        const ref = `${timeCont.alias}.${timeCont.key}`;
        let str = ref;
        const key = `select_${selectIndex}_time_${timeIndex}`;
        if (t.lessOrEqual) {
          str = `if(${ref} <= :${key}_less,${str},${onFalse})`;
          qb.setParameter(`${key}_less`, dayjs(t.lessOrEqual).startOf('second').toDate());
        }
        if (t.moreOrEqual) {
          str = `if(${ref} >= :${key}_more,${str},${onFalse})`;
          qb.setParameter(`${key}_more`, dayjs(t.moreOrEqual).endOf('second').toDate());
        }
        qb.addSelect(`${sqlFunc}(${str})`, `result_${selectIndex}_time_${timeIndex}`)
      });
    });
    const rawArray = await qb.getRawMany();
    return rawArray.map((raw) => {
      const ret = {};
      afterFun.forEach((fun) => fun(raw, ret));
      return ret;
    })
  }
}