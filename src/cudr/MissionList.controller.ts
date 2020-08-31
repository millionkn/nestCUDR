import { Controller, Post, Body, Type, BadRequestException } from "@nestjs/common";
import { getConnection, getMetadataArgsStorage } from "typeorm";
import { loadClassByEntityName } from "./cudr.module";
import { CudrBaseEntity } from "./CudrBase.entity";
import { ID, loadType } from "src/utils";

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
    await getConnection().transaction(async (manager) => {
      const stack = new Map<Type<CudrBaseEntity<any>>, ID<any>>();
      for await (const mission of missionList) {
        const klass = loadClassByEntityName(mission.entityName);
        if (mission.type === 'save') {
          getMetadataArgsStorage()
            .filterRelations(klass)
            .filter((arg) => {
              if (arg.relationType === 'many-to-one') { return true }
              if (arg.relationType === 'one-to-one') {
                const joinColumns = getMetadataArgsStorage().filterJoinColumns(klass, arg.propertyName);
                return joinColumns.length > 0;
              }
            })
            .filter((arg) => {
              const subKlass = loadType(klass.prototype, arg.propertyName);
              return stack.has(subKlass);
            })
            .forEach((arg) => {
              if (!(arg.propertyName in mission.entity)) {
                const entity: any = mission.entity;
                entity[arg.propertyName] = { id: stack.get(loadType(klass.prototype, arg.propertyName)) };
              }
            });
          const result = await manager.save(klass, mission.entity);
          stack.set(klass, result.id);
        } else if (mission.type === 'delete') {
          await manager.delete(klass, mission.ids);
        } else {
          // @ts-ignore
          throw new BadRequestException(`未知任务类型:${mission.type}`)
        }
      }
    })
  }
}