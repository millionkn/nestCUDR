import { createDecorator, loadDecoratorData } from "src/utils/decorator";
import { getMetadataArgsStorage } from 'typeorm';
import { CudrBaseEntity } from "./CudrBase.entity";
import { getTagetKey } from "src/utils/getTargetKey";
import { Type } from "@nestjs/common";
import { loadClassByEntityName } from "./tools";

const savedNames: string[] = [];
export const CudrEntity = createDecorator(`CudrEntity`, (
  meta: void | {
    name?: string,
  },
  klass: Type<CudrBaseEntity>
) => {
  if (!meta) { meta = {} };
  let name: string;
  if (meta.name) {
    name = meta.name;
  } else {
    if (!/Entity$/.test(klass.name)) { throw new Error(`${klass.name}类名必须以'Entity'结尾`) }
    name = klass.name.replace(/Entity$/, '').toLowerCase();
  }
  if (savedNames.includes(name)) { throw new Error(`重复名称:${name}`); }
  savedNames.push(name);
  return {
    name,
  };
})

export const DeepQuery = createDecorator('DeepQuery', (
  meta: void,
  klass: Type<CudrBaseEntity>,
  key: string,
) => {
  return () => {
    const storage = getMetadataArgsStorage();
    const metaArg = storage.filterRelations(klass).filter(args => args.propertyName === key)[0];
    if (metaArg === undefined) { throw new Error(`找不到${klass.name}#${key}的类型数据`); }
    let type = metaArg.type;
    if(typeof type ==='string'){
      throw new Error();
    }
    if (!(type().prototype instanceof CudrBaseEntity)) {
      throw new Error(`${klass.name}#${key}查询时必须继承${CudrBaseEntity.name}`);
    }
    return {
      subKlass: type() as Type<CudrBaseEntity>,
      metaArg,
    };
  }
});

export const QueryLast = createDecorator('QueryLast', (
  meta: void,
  klass: Type<CudrBaseEntity>,
  key: string,
) => () => {
  const { metaArg } = loadDecoratorData(DeepQuery, klass, key)();
  if (metaArg.relationType !== 'one-to-one') { throw new Error(`${klass.name}#${key}必须是一对一关系`) }
  const otherSide = metaArg.inverseSideProperty;
  if (typeof otherSide === 'function') {
    return { otherSide: getTagetKey(otherSide) }
  } else if (typeof otherSide === 'string') {
    return { otherSide };
  } else {
    throw new Error(`必须指定另一侧`);
  }
});

export const QueryTag = createDecorator('QueryTag', (
  meta: {
    type?: () => any,
  },
  klass: Type<CudrBaseEntity>,
  key: string,
) => {
  return {
    type: meta.type || (() => Reflect.getMetadata('design:type', klass.prototype, key)),
  }
});
