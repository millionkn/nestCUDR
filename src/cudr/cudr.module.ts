import { Module, DynamicModule, Controller, Post, Body, Type, BadRequestException } from '@nestjs/common';
import { BlobModule } from './blob/blob.module';
import { MissionListController } from './MissionList.controller';
import { loadDecoratedKlass, loadDecoratorData, isDecorated } from 'src/utils/decorator';
import { CudrEntity, DeepQuery, QueryTag } from './decorators';
import { QueryOption, jsonQuery } from './jsonQuery/jsonQuery';
import { getRepository } from 'typeorm';
import { CudrBaseEntity } from './CudrBase.entity';
import * as moment from 'moment';

function transformerTo<T extends CudrBaseEntity>(klass: Type<T>, entities: Array<T> | T) {
  if (!(entities instanceof Array)) {
    entities = [entities];
  }
  entities.forEach((entity: any) => {
    Object.keys(entity).forEach(key => {
      if (isDecorated(DeepQuery, klass, key)) {
        const data = loadDecoratorData(DeepQuery, klass, key)();
        transformerTo(data.subKlass, entity[key]);
      } else if (isDecorated(QueryTag, klass, key)) {
        const type = loadDecoratorData(QueryTag, klass, key).type();
        if (type === Date) {
          entity[key] = moment(entity[key]).format('YYYY-MM-DD HH:mm:ss');
        } else if (type === Number) {
          entity[key] = Number.parseFloat(entity[key]);
        }
      }
    });
  })
}

@Module({
  imports: [
    BlobModule,
  ]
})
export class CudrModule {
  static factory(): DynamicModule {
    return {
      module: CudrModule,
      controllers: [
        MissionListController,
        ...loadDecoratedKlass(CudrEntity).map((klass) => {
          const name = loadDecoratorData(CudrEntity, klass).name;
          @Controller(`cudr/${name}`)
          class CudrController {
            @Post('findEntityList')
            async findEntityList(@Body() body: {
              where: QueryOption<InstanceType<typeof klass>>,
              pageIndex?: number,
              pageSize?: number,
            }) {
              if (false
                || typeof body !== 'object'
                || typeof body.where !== 'object'
                || body.where === null
              ) {
                throw new BadRequestException('缺少where')
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
                    if (opt.userMeta.sortIndex === 0) { throw new BadRequestException('sortIndex不能为0') }
                    qb.addOrderBy(`${opt.alias}.${opt.key}`, opt.userMeta.sortIndex > 0 ? 'ASC' : 'DESC');
                  });
                qb.addOrderBy(`body.createDate`, 'DESC');
                const [selectResult, total] = await qb.getManyAndCount();
                transformerTo(klass, selectResult);
                return {
                  data: selectResult,
                  total,
                };
              }
            }
            @Post('findSum')
            async findSum(@Body() body: {
              where: QueryOption<InstanceType<typeof klass>>,
              date: {
                moreOrEqual?: string,
                lessOrEqual?: string,
              }[],
            }) {
              if (false
                || typeof body !== 'object'
                || typeof body.where !== 'object'
                || body.where === null
              ) {
                throw new BadRequestException('缺少where')
              }
              const qb = getRepository(klass).createQueryBuilder(`body`);
              const contextArr = jsonQuery(qb, `body`, klass, body.where);
              if (contextArr.filter((cont) => typeof cont.userMeta.groupByAlias === 'string').length === 0) {
                throw new BadRequestException('缺少groupByAlias');
              } else if (contextArr.filter((cont) => typeof cont.userMeta.weight === 'number').length === 0) {
                throw new BadRequestException('缺少weight');
              } else if (!(body.date instanceof Array)) {
                throw new BadRequestException('date必须是数组');
              }
              qb.select('1');
              const callback: Array<(obj: { target: any, value: any[] }, raw: any) => void> = [];
              contextArr.filter((cont) => typeof cont.userMeta.groupByAlias === 'string')
                .forEach((cont, index) => {
                  qb.addGroupBy(`${cont.alias}.${cont.key}`)
                    .addSelect(`${cont.alias}.${cont.key}`, `result${index}`);
                  callback.push((obj, raw) => obj.target[cont.userMeta.groupByAlias] = raw[`result${index}`]);
                });
              const sumStrBase = contextArr
                .filter((cont) => typeof cont.userMeta.weight === 'number')
                .map((cont) => `${cont.userMeta.weight}*${cont.alias}.${cont.key}`)
                .join('+');
              body.date.forEach((dateInfo, dateIndex) => {
                let sumStr = sumStrBase;
                if (dateInfo.moreOrEqual) {
                  sumStr = `if(body.createDate>=:more,${sumStr},0)`;
                  qb.setParameter('more', moment(dateInfo.moreOrEqual).startOf('second').toDate())
                }
                if (dateInfo.lessOrEqual) {
                  sumStr = `if(body.createDate<=:less,${sumStr},0)`;
                  qb.setParameter('less', moment(dateInfo.lessOrEqual).endOf('second').toDate())
                }
                qb.addSelect(`sum(${sumStr})`, `date${dateIndex}`);
                callback.push((obj, raw) => obj.value.push(raw[`date${dateIndex}`]));
              });
              const result = await qb.getRawMany();
              return result.map((raw) => {
                const obj: any = {
                  target: {},
                  value: [],
                };
                callback.forEach((fun) => fun(obj, raw));
                return obj;
              });
            }
          }
          let controllerKlass = eval(`class ${name}CudrController extends CudrController{};${name}CudrController`);
          return controllerKlass;
        }),
      ],
    }
  }
}