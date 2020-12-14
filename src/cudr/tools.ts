import { loadDecoratedKlass, loadDecoratorData, isDecorated } from "@/utils/decorator";
import { CudrEntity, DeepQuery, QueryTransformer } from "./decorators";
import { Type } from "@nestjs/common";
import { BaseEntity } from "@/utils/entity";

export function loadClassByEntityName(name: string): Type<BaseEntity> {
  const klass = loadDecoratedKlass(CudrEntity).find(klass => {
    const data = loadDecoratorData(CudrEntity, klass);
    return data.name.toLowerCase() === name.toLowerCase();
  });
  if (klass === undefined) { throw new Error(`未声明CudrEntity:${name}`) }
  return klass;
}

export function entityTransformerTo<T extends BaseEntity>(klass: Type<T>, entities: Array<T> | T) {
  if (!(entities instanceof Array)) {
    entities = [entities];
  }
  entities.forEach((entity: any) => {
    if (typeof entity !== 'object' || entity === null) { return }
    Object.keys(entity).forEach(key => {
      if (isDecorated(DeepQuery, klass, key)) {
        const data = loadDecoratorData(DeepQuery, klass, key)();
        entityTransformerTo(data.subKlass, entity[key]);
      } else if (isDecorated(QueryTransformer, klass, key)) {
        const transformer = loadDecoratorData(QueryTransformer, klass, key);
        entity[key] = transformer.toClient(entity[key], entity);
      }
    });
  })
}

export function entityTransformerFrom<T extends BaseEntity>(klass: Type<T>, entities: Array<T> | T) {
  if (!(entities instanceof Array)) {
    entities = [entities];
  }
  entities.forEach((entity: any) => {
    if (typeof entity !== 'object' || entity === null) { return }
    Object.keys(entity).forEach(key => {
      if (isDecorated(DeepQuery, klass, key)) {
        const data = loadDecoratorData(DeepQuery, klass, key)();
        entityTransformerFrom(data.subKlass, entity[key]);
      } else if (isDecorated(QueryTransformer, klass, key)) {
        const transformer = loadDecoratorData(QueryTransformer, klass, key);
        entity[key] = transformer.fromClient(entity[key], entity);
      }
    });
  })
}
