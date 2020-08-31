export function duplicateRemoval<T, K>(arr: T[], fun: (a: T) => any, retFun: (a: T) => K): K[];
export function duplicateRemoval<T, K>(arr: T[], fun: (a: T) => any): T[];
export function duplicateRemoval<T, K>(arr: T[], fun: (a: T) => any, retFun?: (a: T) => K) {
  if (retFun) {
    return [...new Set(arr.map(fun))].map(r => retFun(arr.find(t => fun(t) === r) as T));
  } else {
    return [...new Set(arr.map(fun))].map(r => arr.find(t => fun(t) === r) as T);
  }
}

const keyLoaderProxy = new Proxy<any>({}, {
  get(target, key) {
    return key;
  }
})
export function loadKeyOfTypeFun(fun: (obj: any) => any) {
  return fun(keyLoaderProxy) as string;
}

export function loadMetadata<T>(metadateKey: any, defaultValue: () => T, target: any, key?: string | symbol): T {
  if (key) {
    if (!Reflect.hasMetadata(metadateKey, target, key)) {
      const value = defaultValue();
      Reflect.defineMetadata(metadateKey, value, target, key);
      return value;
    }
    return Reflect.getMetadata(metadateKey, target, key)
  } else {
    if (!Reflect.hasMetadata(metadateKey, target)) {
      const value = defaultValue();
      Reflect.defineMetadata(metadateKey, value, target);
      return value;
    }
    return Reflect.getMetadata(metadateKey, target)
  }
}

export const ID = Symbol();
type IDT<T> = { [ID]: T };
export type ID<T> = string & IDT<T>

const oneTimeSymbol = Symbol();
export function oneTimeFunc<T>(func: () => T): () => T {
  let result: any = oneTimeSymbol;
  return () => {
    if (result === oneTimeSymbol) { result = func() }
    return result;
  }
}

// 用于类型推断，如果需要对一个变量写很长的类型声明并且变量不会改变时使用
export function OneTimeFunc(): MethodDecorator {
  return (prototype: any, key) => {
    const fun = prototype[key];
    prototype[key] = oneTimeFunc(fun);
  }
}

export function hasTypeFun(prototype: any, key: string) {
  return Reflect.hasMetadata('design:typeFun', prototype, key);
}
export function loadType(prototype: any, key: string) {
  const typeFun = Reflect.getMetadata('design:typeFun', prototype, key);
  if (typeFun) { return typeFun() }
  return Reflect.getMetadata('design:type', prototype, key);
}
export function TypeFun(typeFun: () => any) {
  return (prototype: any, key: string) => {
    Reflect.metadata('design:typeFun', typeFun)(prototype, key);
  }
}