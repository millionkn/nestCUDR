import { loadDecoratedKlass, loadDecoratorData, createKlassDecorator } from "@/utils/decorator";
import { Type } from "@nestjs/common";
import { Entity } from "typeorm";

const CudrBaseEntitySym = Symbol();

@Entity()
export class CudrBaseEntity<T extends string = any> {
  [CudrBaseEntitySym]?: {
    name: 'entity',
    type: T,
  }
}

export function loadClassByEntityName(name: string): Type<CudrBaseEntity> {
  const klass = loadDecoratedKlass(CudrEntity).find(klass => {
    const data = loadDecoratorData(CudrEntity, klass);
    return data.name.toLowerCase() === name.toLowerCase();
  });
  if (klass === undefined) { throw new Error(`未声明CudrEntity:${name}`) }
  return klass;
}

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