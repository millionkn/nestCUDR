import { Controller, Post, Body, Type, BadRequestException } from "@nestjs/common";
import { getConnection, getMetadataArgsStorage } from "typeorm";
import { CudrBaseEntity } from "./CudrBase.entity";
import { CudrEventSubject } from "./transactionEvent";
import { ID } from "src/utils/entity";
import { loadClassByEntityName } from "./tools";
import { decoratedKeys, loadDecoratorData } from "src/utils/decorator";
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
    const eventFun = new Array<() => void>();
    await getConnection().transaction(async (manager) => {
      const stack = new Map<Type<CudrBaseEntity<any>>, ID<any>>();
      for await (const mission of missionList) {
        const klass = loadClassByEntityName(mission.entityName);
        const eventSubject = CudrEventSubject(klass);
        if (mission.type === 'save') {
          decoratedKeys(DeepQuery, klass).filter((key) => {
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
            if (!(arg.propertyName in mission.entity)) {
              const entity: any = mission.entity;
              entity[arg.propertyName] = { id: stack.get(subKlass) };
            }
          });
          const result = await manager.save(klass, mission.entity);
          stack.set(klass, result.id);
          if (mission.entity.id === undefined) {
            eventFun.push(() => eventSubject.next({
              type: 'insert',
              entity: result,
            }));
          }
        } else if (mission.type === 'delete') {
          const result = await manager.findByIds(klass, mission.ids, { loadRelationIds: true });
          await manager.delete(klass, mission.ids);
          result.forEach((entity) => {
            eventFun.push(() => eventSubject.next({
              type: 'delete',
              entity
            }));
          });
        } else {
          // @ts-ignore
          throw new BadRequestException(`未知任务类型:${mission.type}`)
        }
      }
    });
    eventFun.forEach((fun) => fun());
  }
}