import { loadDecoratedKlass, loadDecoratorData } from "src/utils/decorator";
import { CudrEntity } from "./decorators";
import { Type } from "@nestjs/common";
import { BaseEntity } from "src/utils/entity";

export function loadClassByEntityName(name: string):Type<BaseEntity> {
  const klass = loadDecoratedKlass(CudrEntity).find(klass => {
    const data = loadDecoratorData(CudrEntity, klass);
    return data.name.toLowerCase() === name.toLowerCase();
  });
  if (klass === undefined) { throw new Error(`未声明CudrEntity:${name}`) }
  return klass;
}
