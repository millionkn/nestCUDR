import { Controller, Post, Body, Type, BadRequestException } from "@nestjs/common";
import { getConnection, getMetadataArgsStorage, EntityManager } from "typeorm";
import { CudrBaseEntity } from "./CudrBase.entity";
import { ID } from "@/utils/entity";
import { loadClassByEntityName, entityTransformerFrom } from "./tools";
import { loadDecoratedKeys, loadDecoratorData } from "@/utils/decorator";
import { DeepQuery } from "./decorators";

type SaveMission = {
  type: 'save',
  entityName: string,
  entity: CudrBaseEntity<any>;
}
type DeleteMission = {
  type: 'delete',
  entityName: string,
  ids: ID<any>[],
}
@Controller('cudr')
export class MissionListController {
  @Post('transaction')
  async transaction(@Body() missionList: Array<SaveMission | DeleteMission>) {
    if (!(missionList instanceof Array)) { missionList = [missionList]; }
    await getConnection().transaction(async (manager) => {
      const stack = new Map<Type<CudrBaseEntity<any>>, ID<any>>();
      for await (const mission of missionList) {
        const klass = loadClassByEntityName(mission.entityName);
        if (mission.type === 'save') {
          const entity: any = mission.entity;
          loadDecoratedKeys(DeepQuery, klass).filter((key) => {
            const arg = loadDecoratorData(DeepQuery, klass, key)().metaArg;
            if (arg.relationType === 'many-to-one') { return true }
            if (arg.relationType === 'one-to-one') {
              const joinColumns = getMetadataArgsStorage().filterJoinColumns(klass, arg.propertyName);
              return joinColumns.length > 0;
            }
          }).filter((key) => {
            return stack.has(loadDecoratorData(DeepQuery, klass, key)().subKlass)
          }).forEach((key) => {
            const {
              metaArg: arg,
              subKlass,
            } = loadDecoratorData(DeepQuery, klass, key)();
            if (!(arg.propertyName in entity)) {
              entity[arg.propertyName] = { id: stack.get(subKlass) };
            }
          });
          entityTransformerFrom(klass, entity)
          const result = await manager.save(klass, entity);
          stack.set(klass, result.id);
        } else if (mission.type === 'delete') {
          const result = await manager.findByIds(klass, mission.ids, { loadRelationIds: true });
          await manager.delete(klass, mission.ids);
        } else {
          // @ts-ignore
          throw new BadRequestException(`未知任务类型:${mission.type}`)
        }
      }
    });
  }
}
