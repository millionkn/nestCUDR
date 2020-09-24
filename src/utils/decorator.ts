import 'reflect-metadata';

type Type<T = any> = new (...args: any[]) => T;

// K:可以被此修饰器修饰的键类型
// M:meta输入类型
// R:meta输出类型

const metaOutSym = Symbol();
const constructorSym = Symbol();
const nameSym = Symbol();
const decoratedKlassSym = Symbol();
const decoratedKeysSymSym = Symbol();

export class NotDecoratedError extends Error { }

export type KeyDecorator<T, K extends string | symbol, M extends any[], R> = (...meta: M) => ((prototype: T, key: K) => any) & { [metaOutSym]: R };
export type KlassDecorator<T, M extends any[], R> = (...meta: M) => ((klass: Type<T>) => any) & { [metaOutSym]: R };

export function createKeyDecorator<T, K extends string | symbol, M extends any[], R>(
  funName: string,
  fun: (klass: Type, key: K) => (...meta: M) => R
): KeyDecorator<T, K, M, R> {
  const decoratedKeysSym = Symbol(`${funName} decoratedKeys`);
  const decorator: any = (...args: M) => {
    return (prototype: any, key: K) => {
      const meta = fun(prototype.constructor, key)(...args);
      if (!Reflect.hasOwnMetadata(decoratedKeysSym, prototype)) {
        Reflect.defineMetadata(decoratedKeysSym, [], prototype);
      }
      Reflect.getMetadata(decoratedKeysSym, prototype).push(key);
      Reflect.defineMetadata(decorator, meta, prototype, key);
    };
  };
  decorator[nameSym] = funName;
  decorator[decoratedKeysSymSym] = decoratedKeysSym;
  return decorator;
}

export function createKlassDecorator<T, M extends any[], R>(
  funName: string,
  fun: (klass: Type) => (...meta: M) => R
): KlassDecorator<T, M, R> {
  const decorator: any = (...args: M) => {
    return (klass: Type) => {
      const meta = fun(klass)(...args);
      Reflect.defineMetadata(decorator, meta, klass.prototype, constructorSym);
      decorator[decoratedKlassSym].push(klass);
    };
  };
  decorator[nameSym] = funName;
  decorator[decoratedKlassSym] = [];
  return decorator;
}

export function loadDecoratorData<T, R>(decorator: KlassDecorator<T, any, R>, klass: Type<T>): R;
export function loadDecoratorData<T, K extends string | symbol, R>(decorator: KeyDecorator<T, K, any, R>, klass: Type, key: K): R;
export function loadDecoratorData(decorator: any, klass: Type, key?: string | symbol): any {
  const funName = decorator[nameSym];
  key = key || constructorSym;
  if (!Reflect.hasMetadata(decorator, klass.prototype, key)) {
    throw new NotDecoratedError(`${klass.name}${key ? `#${String(key)}` : ''}没有被${funName}修饰过`);
  }
  return Reflect.getMetadata(decorator, klass.prototype, key);
}

export function loadDecoratedKlass(decorator: KlassDecorator<any, any, any>): Type[];
export function loadDecoratedKlass(decorator: any) {
  return decorator[decoratedKlassSym] || [];
}

export function loadDecoratedKeys<K extends string | symbol>(decorator: KeyDecorator<any, K, any, any>, klass: Type): K[];
export function loadDecoratedKeys(decorator: any, klass: Type): any {
  let target = klass.prototype;
  const decoratedKeysSym = decorator[decoratedKeysSymSym];
  const keySet = new Set<any>();
  while (target) {
    if (Reflect.hasOwnMetadata(decoratedKeysSym, target)) {
      Reflect.getMetadata(decoratedKeysSym, target).forEach((key: any) => keySet.add(key));
    }
    target = Object.getPrototypeOf(target);
  }
  return [...keySet];
}

export function isDecorated(decorator: KlassDecorator<any, any, any>, klass: Type): boolean;
export function isDecorated<K extends string | symbol>(decorator: KeyDecorator<any, K, any, any>, klass: Type, key: K): boolean;
export function isDecorated(decorator: any, klass: Type, key?: any): boolean {
  if (key) {
    return Reflect.hasMetadata(decorator, klass.prototype, key);
  } else {
    return Reflect.hasMetadata(decorator, klass, constructorSym);
  }
}
