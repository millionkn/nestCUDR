import { Type, Controller, Post, Body, Inject } from "@nestjs/common";
import { loadCudrMetadata, useTransformerTo } from "./cudr.module";
import { WhereOption, JsonQueryService } from "./json-query.service";
import { CudrBaseEntity } from "./CudrBase.entity";

export function createCudrController<T extends CudrBaseEntity<any>>(klass: Type<T>) {
  const { entityName } = loadCudrMetadata(klass)
  @Controller(`cudr/${entityName}`)
  class CudrController {
    @Inject(JsonQueryService)
    jsonQuery!: JsonQueryService;
    @Post('findEntityList')
    async findEntityList(@Body() body: {
      where: WhereOption<T>,
      pageIndex?: number,
      pageSize?: number,
    }) {
      const [selectResult, total] = await this.jsonQuery.queryWhere(klass, body, (qb) => qb.getManyAndCount());
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