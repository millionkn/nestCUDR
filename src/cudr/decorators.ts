import { loadDecoratorData, createKlassDecorator, createKeyDecorator } from "@/utils/decorator";
import { getMetadataArgsStorage } from "typeorm";
import { CudrBaseEntity } from "./CudrBase.entity";
import { getTagetKey } from "@/utils/getTargetKey";
import { Type } from "@nestjs/common";
import { ID } from "@/utils/entity";

const savedNames: string[] = [];
export const CudrEntity = createKlassDecorator(`CudrEntity`, (klass: Type<CudrBaseEntity>) => (
  meta?: {
    name?: string,
  },
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

export const DeepQuery = createKeyDecorator('DeepQuery', (klass: Type<CudrBaseEntity>, key: string) => (
) => {
  return () => {
    const storage = getMetadataArgsStorage();
    const metaArg = storage.filterRelations(klass).filter(args => args.propertyName === key)[0];
    if (metaArg === undefined) { throw new Error(`找不到${klass.name}#${key}的类型数据`); }
    let type = metaArg.type;
    if (typeof type === 'string') {
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

export const QueryTransformer = createKeyDecorator(`Transformer`, () => (meta: {
  toClient?: (value: any, entity: any) => any,
  fromClient?: (value: any, entity: any) => any,
}) => {
  return {
    toClient: meta.toClient || ((value, entity) => value),
    fromClient: meta.fromClient || ((value, entity) => value),
  }
});

export const QueryType = createKeyDecorator(`QueryType`, () => (meta: {
  type: typeof ID,
}) => meta);
