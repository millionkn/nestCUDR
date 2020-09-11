import { Module, DynamicModule, Controller, Post, Body, Type, BadRequestException } from '@nestjs/common';
import { BlobModule } from './blob/blob.module';
import { MissionListController } from './MissionList.controller';
import { decoratedKlass, loadDecoratorData, decoratedKeys, isDecorated } from 'src/utils/decorator';
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
        }else if(type === Number){
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
        ...decoratedKlass(CudrEntity).map((klass) => {
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
              jsonQuery(qb, `body`, klass, body.where);
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
                qb.addOrderBy(`body.createDate`, 'DESC');
                const [selectResult, total] = await qb.getManyAndCount();
                transformerTo(klass, selectResult);
                return {
                  data: selectResult,
                  total,
                };
              }
            }
          }
          let controllerKlass = eval(`class ${name}CudrController extends CudrController{};${name}CudrController`);
          return controllerKlass;
        }),
      ],
    }
  }
}