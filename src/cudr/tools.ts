import { decoratedKlass, loadDecoratorData } from "src/utils/decorator";
import { CudrEntity } from "./decorators";

export function loadClassByEntityName(name: string) {
  const klass = decoratedKlass(CudrEntity).find(klass=>{
    const data = loadDecoratorData(CudrEntity,klass);
    return data.name.toLowerCase() === name.toLowerCase();
  });
  if(klass === undefined){ throw new Error(`未声明CudrEntity:${name}`) }
  return klass;
}
