import { Controller, Post, Body, Inject, Type } from "@nestjs/common";
import { ModuleRef } from "@nestjs/core";
import { Connection, EntityManager } from "typeorm";
import { CudrBaseEntity, loadClassByEntityName, useTransformerFrom, ID } from "./cudr.module";
import { loadKeyOfTypeFun } from "src/utils";

type UpdateMission = {
  entityName: string,
  object: any;
}
type DeleteMission = {
  entityName: string,
  object: any;
}
type ChainPointInfo<T> = {
  otherSide: (obj: T) => CudrBaseEntity,
  klassFun: () => Type<T>,
  key: string,
};
export function loadChainPoint<T extends CudrBaseEntity>(prototype: T): ChainPointInfo<CudrBaseEntity>[] {
  if (!Reflect.hasMetadata(ChainPoint, prototype)) {
    Reflect.defineMetadata(ChainPoint, [], prototype);
  }
  return Reflect.getMetadata(ChainPoint, prototype);
}
export function ChainPoint<T extends CudrBaseEntity>(
  type: () => Type<T>,
  otherSide: (obj: T) => CudrBaseEntity,
) {
  return (prototype: any, key: string) => {
    loadChainPoint(prototype).push({
      otherSide: otherSide as any,
      klassFun: type,
      key,
    });
  }
}
@Controller('cudr/transaction')
export class MissionListController {
  @Inject(ModuleRef)
  ref!: ModuleRef;
  @Inject(Connection)
  private connection!: Connection
  @Post('chain/save')
  async save(@Body() missionList: UpdateMission[]) {
    await this.connection.transaction(async (manager) => {
      for await (const mission of missionList) {
        const klass = loadClassByEntityName(mission.entityName);
        useTransformerFrom(klass, mission.object)
        await this.saveChain(manager, mission.object, klass);
      }
    })
  }

  private async saveChain(manager: EntityManager, target: any, klass: Type<CudrBaseEntity>) {
    let id: ID;
    const chainInfo = loadChainPoint(klass.prototype);
    const targetWithOutChainPoint = { ...target };
    chainInfo.forEach((info) => delete targetWithOutChainPoint[info.key])
    if (typeof target.id === 'string') {
      await manager.update(klass, target.id, targetWithOutChainPoint);
      id = target.id;
    } else {
      const created = await manager.save(manager.create(klass, targetWithOutChainPoint))
      id = created.id;
    }

    if (chainInfo.length === 0) { return; }
    for await (const info of chainInfo) {
      const value = target[info.key];
      if (value instanceof Array) {
        const otherSideKey = loadKeyOfTypeFun(info.otherSide);
        const savedArr = await manager.find(info.klassFun(), { where: { [otherSideKey]: id } })
        const updateIds: ID[] = value.map((o) => o.id);
        const deleteObjects = savedArr.filter((saved) => !updateIds.includes(saved.id))
        for await (const deleteObj of deleteObjects) {
          await this.deleteChain(manager, deleteObj, info.klassFun());
        }
        for await (const sub of value) {
          sub[otherSideKey] = { id };
          await this.saveChain(manager, sub, info.klassFun());
        }
      }
    }
  }

  @Post('chain/delete')
  async delete(@Body() missionList: DeleteMission[]) {
    await this.connection.transaction(async (manager) => {
      for await (const mission of missionList) {
        await this.deleteChain(manager, mission.object, loadClassByEntityName(mission.entityName));
      }
    })
  }

  private async deleteChain(manager: EntityManager, target: any, klass: Type<CudrBaseEntity>) {
    const chainInfo = loadChainPoint(klass.prototype);
    for await (const info of chainInfo) {
      const otherSideKey = loadKeyOfTypeFun(info.otherSide);
      const savedArr = await manager.find(info.klassFun(), { where: { [otherSideKey]: target } });
      for await (const saved of savedArr) {
        await this.deleteChain(manager, saved, info.klassFun());
      }
    }
    if (typeof target.id !== 'string') {
      throw new Error(`${target}#id不是字符串`);
    }
    await manager.delete(klass, target.id);
  }
}