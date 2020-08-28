import { Type, Controller, Post, Body, Inject } from "@nestjs/common";
import { loadCudrMetadata, useTransformerTo } from "./cudr.module";
import { CudrBaseEntity } from "./CudrBase.entity";
import { jsonQuery, QueryOption } from "./jsonQuery/jsonQuery";
import { getRepository } from "typeorm";

export function createCudrController<T extends CudrBaseEntity<any>>(klass: Type<T>) {
  const { entityName } = loadCudrMetadata(klass)
  @Controller(`cudr/${entityName}`)
  class CudrController {
    @Post('findEntityList')
    async findEntityList(@Body() body: {
      where: QueryOption<T>,
      pageIndex?: number,
      pageSize?: number,
    }) {
      const qb = getRepository(klass).createQueryBuilder(`body`);
      jsonQuery(qb, `body`, klass, body.where);
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