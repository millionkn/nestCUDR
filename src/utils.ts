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

const ID = Symbol();
type IDT<T> = { [ID]: T };
export type ID<T> = String & IDT<T>

const oneTimeSymbol = Symbol();
export function oneTimeFunc<T>(func: () => T): () => T {
  let result: any = oneTimeSymbol;
  return () => {
    if (result === oneTimeSymbol) { result = func() }
    return result;
  }
}
