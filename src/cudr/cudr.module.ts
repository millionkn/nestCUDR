import { Module, DynamicModule, CanActivate, Type } from '@nestjs/common';
import { BlobModule } from './blob/blob.module';
import { MissionListController } from './MissionList.controller';
import { CudrBaseEntity, loadTransformerTo } from './CudrBase.entity';
import { createCudrController } from './createCudrController';
import { loadMetadata, loadType } from 'src/utils';

type CudrOpt = {
  /**
   * 会被应用到增删改接口上，用法可参照 @UseGuards 修饰器
   */
  guards?: () => (Function | CanActivate)[],
}

const savedInfoMap = new Map<Type<CudrBaseEntity<any>>, {
  cudrOpt: CudrOpt,
  controllerClassFun: () => Type<object>,
  entityName: string,
  privateColumns: string[],
}>();
const savedEntity = new Map<string, Type<CudrBaseEntity<any>>>();
/**
 * 被修饰的实体会产生相应的controller，提供对应的cudr接口，具体看readme
 * @param opt 
 */
export function CudrEntity(opt: CudrOpt) {
  return (klass: Type<CudrBaseEntity<any>>) => {
    if (!/Entity$/.test(klass.name)) { throw new Error(`${klass.name}类名必须以'Entity'结尾`) }
    let entityName = klass.name.replace(/Entity$/, '').toLowerCase();
    if (savedInfoMap.has(klass)) { throw new Error(`重复的CudrEntity:${klass.name}`) }
    savedEntity.set(entityName, klass);
    const controllerClassFun = (() => {
      let saved: any;
      return () => {
        if (!saved) { saved = createCudrController(klass) }
        return saved;
      }
    })();
    savedInfoMap.set(klass, {
      cudrOpt: opt,
      controllerClassFun,
      entityName,
      privateColumns: loadMetadata(PrivateColumn, () => new Array<string>(), klass.prototype)
    });
  }
}
export function PrivateColumn() {
  return (prototype: any, key: string) => {
    loadMetadata(PrivateColumn, () => new Array<string>(), prototype).push(key)
  }
}
export function loadCudrMetadata(klass: Type<CudrBaseEntity<any>>) {
  const info = savedInfoMap.get(klass);
  if (info === undefined) {
    throw new Error(`未声明CudrEntity:${klass.name}`)
  }
  return info;
}
export function loadClassByEntityName(entityName: string) {
  const entityKlass = savedEntity.get(entityName.toLowerCase());
  if (entityKlass === undefined) { throw new Error(`未声明CudrEntity:${entityName}`) }
  return entityKlass;
}

export function useTransformerTo(klass: Type<CudrBaseEntity<any>>, object: any) {
  if (object === undefined || object === null) { return }
  if (object instanceof Array) {
    object.forEach((o) => useTransformerTo(klass, o));
  } else {
    const map = loadTransformerTo(klass.prototype);
    for (const key in object) {
      if (object.hasOwnProperty(key)) {
        const type = loadType(klass.prototype,key);
        if (type && type.prototype instanceof CudrBaseEntity) {
          const value: any = object[key];
          useTransformerTo(type, value);
        }
      }
    }
    map.forEach((fun, key) => { if (key in object) { object[key] = fun(object[key]) } });
  }
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
        ...[...savedInfoMap.values()].map((info) => info.controllerClassFun()),
      ],
    }
  }
}