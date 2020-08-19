import { Controller, Post, Body, Type, ForbiddenException } from "@nestjs/common";
import { EntityManager, getConnection } from "typeorm";
import { loadClassByEntityName, useTransformerFrom, loadCudrMetadata } from "./cudr.module";
import { loadKeyOfTypeFun, ID } from "src/utils";
import { CudrBaseEntity } from "./CudrBase.entity";

type UpdateMission = {
  entityName: string,
  object: any;
}
type DeleteMission = {
  entityName: string,
  object: any;
}
type ChainPointInfo<T> = {
  otherSide: (obj: T) => CudrBaseEntity<any>,
  klassFun: () => Type<T>,
  key: string,
};
export function loadChainPoint<T extends CudrBaseEntity<any>>(prototype: T): ChainPointInfo<CudrBaseEntity<any>>[] {
  if (!Reflect.hasMetadata(ChainPoint, prototype)) {
    Reflect.defineMetadata(ChainPoint, [], prototype);
  }
  return Reflect.getMetadata(ChainPoint, prototype);
}
export function ChainPoint<T extends CudrBaseEntity<any>>(
  type: () => Type<T>,
  otherSide: (obj: T) => CudrBaseEntity<any>,
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
  @Post('chain/save')
  async save(@Body() missionList: UpdateMission[]) {
    await getConnection().transaction(async (manager) => {
      for await (const mission of missionList) {
        const klass = loadClassByEntityName(mission.entityName);
        useTransformerFrom(klass, mission.object)
        await this.saveChain(manager, mission.object, klass);
      }
    })
  }

  private async saveChain(manager: EntityManager, target: any, klass: Type<CudrBaseEntity<any>>) {
    let id: ID<any>;
    const chainInfo = loadChainPoint(klass.prototype);
    const { privateColumns } = loadCudrMetadata(klass);
    if (Object.keys(target).find((key) => privateColumns.includes(key))) {
      throw new ForbiddenException()
    }
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
        const updateIds: ID<any>[] = value.map((o) => o.id);
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
    await getConnection().transaction(async (manager) => {
      for await (const mission of missionList) {
        await this.deleteChain(manager, mission.object, loadClassByEntityName(mission.entityName));
      }
    })
  }

  private async deleteChain(manager: EntityManager, target: any, klass: Type<CudrBaseEntity<any>>) {
    const chainInfo = loadChainPoint(klass.prototype);
    const { privateColumns } = loadCudrMetadata(klass);
    if (Object.keys(target).find((key) => privateColumns.includes(key))) {
      throw new ForbiddenException()
    }
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