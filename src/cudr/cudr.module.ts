import { Module, DynamicModule, Type, CanActivate } from '@nestjs/common';
import { PrimaryGeneratedColumn, Entity } from 'typeorm';
import { BlobModule } from './blob/blob.module';
import { createCudrController } from './createCudrController';
import { MissionListController } from './MissionList.controller';

type CudrOpt = {
  /**
   * 会被应用到增删改接口上，用法可参照 @UseGuards 修饰器
   */
  guards?: () => (Function | CanActivate)[],
}

const savedInfoMap = new Map<Type<CudrBaseEntity>, {
  cudrOpt: CudrOpt,
  controllerClassFun: () => Type<object>,
  entityName: string,
}>();
const savedEntity = new Map<string, Type<CudrBaseEntity>>();
/**
 * 被修饰的实体会产生相应的controller，提供对应的cudr接口，具体看readme
 * @param opt 
 */
export function CudrEntity(opt: CudrOpt) {
  return (klass: Type<CudrBaseEntity>) => {
    if (!/Entity$/.test(klass.name)) { throw new Error(`${klass.name}类名必须以'Entity'结尾`) }
    let entityName = klass.name.replace(/Entity$/, '');
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
    });
  }
}
export function loadCudrMetadata(klass: Type<CudrBaseEntity>) {
  const info = savedInfoMap.get(klass);
  if (info === undefined) {
    throw new Error(`未声明CudrEntity:${klass.name}`)
  }
  return info;
}
export function loadClassByEntityName(entityName: string) {
  const entityKlass = savedEntity.get(entityName);
  if (entityKlass === undefined) { throw new Error(`未声明CudrEntity:${entityName}`) }
  return entityKlass;
}

export function loadTransformerTo(prototype: any): Map<string, (value: any) => any> {
  if (!Reflect.hasMetadata(loadTransformerTo, prototype)) {
    Reflect.defineMetadata(loadTransformerTo, new Map(), prototype);
  }
  return Reflect.getMetadata(loadTransformerTo, prototype);
}
export function loadTransformerFrom(prototype: any): Map<string, (value: any) => any> {
  if (!Reflect.hasMetadata(loadTransformerFrom, prototype)) {
    Reflect.defineMetadata(loadTransformerFrom, new Map(), prototype);
  }
  return Reflect.getMetadata(loadTransformerFrom, prototype);
}
/**到前端去 */
export function TransformerTo(fun: (value: any) => any) {
  return (prototype: any, key: string) => {
    loadTransformerTo(prototype).set(key, fun);
  }
}
/**从前端来 */
export function TransformerFrom(fun: (value: any) => any) {
  return (prototype: any, key: string) => {
    loadTransformerFrom(prototype).set(key, fun);
  }
}
const ID = Symbol();
export type ID = typeof ID;
@Entity()
export class CudrBaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: ID;
}
export function useTransformerTo(klass: Type<CudrBaseEntity>, object: any) {
  if (object === undefined || object === null) { return }
  if (object instanceof Array) {
    object.forEach((o) => useTransformerTo(klass, o));
  } else {
    const map = loadTransformerTo(klass.prototype);
    for (const key in object) {
      if (object.hasOwnProperty(key)) {
        const type = Reflect.getMetadata('design:type', klass.prototype);
        if (type && type.prototype instanceof CudrBaseEntity) {
          const value: any = object[key];
          useTransformerTo(type, value);
        }
      }
    }
    map.forEach((fun, key) => { if (key in object) { object[key] = fun(object[key]) } });
  }
}
export function useTransformerFrom(klass: Type<CudrBaseEntity>, object: any) {
  if (object instanceof Array) {
    object.forEach((o) => useTransformerFrom(klass, o));
  } else {
    const map = loadTransformerTo(klass.prototype);
    for (const key in object) {
      if (object.hasOwnProperty(key)) {
        const type = Reflect.getMetadata('design:type', klass.prototype);
        if (type && type.prototype instanceof CudrBaseEntity) {
          const value: any = object[key];
          useTransformerFrom(type, value);
        }
      }
    }
    map.forEach((fun, key) => { if (key in object) { object[key] = fun(object[key]) } });
  }
}

/**
 * 所有的查询都不需要权限
 */
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