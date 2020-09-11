import { recursive } from "./recursive";

type Type<T> = new (...args: any[]) => T

export class NotDecoratedError extends Error { }
const metaOnConstructor = Symbol('metaOnConstructor');
const metaTypeSym = Symbol('metaType');
const metaSym = Symbol('metadata');
const funNameSym = Symbol('name');
const klassesSym = Symbol(`klasses`);

export type KlassDecorator<Z, T, K> = ((meta: Z) => (klass: Type<T>) => void) & ({ [metaTypeSym]: [T, K], [klassesSym]: Type<T>[] });
export type KeyDecorator<Z, T, K, M> = ((meta: Z) => (prototype: T, key: M) => void) & ({ [metaTypeSym]: [T, K, M] });

export function createDecorator<Z, T, K>(
  funName: string,
  fun: (meta: Z, klass: Type<T>) => K,
): KlassDecorator<Z, T, K>;
export function createDecorator<Z, T, K, M extends symbol | string>(
  funName: string,
  fun: (meta: Z, klass: Type<T>, key: M) => K,
): KeyDecorator<Z, T, K, M>;
export function createDecorator<Z, K>(
  funName: string,
  fun: (meta: Z, klass: Type<any>, key?: any) => K,
) {
  const storeSym = Symbol(funName);
  const decorator: any = (meta: Z) => {
    return (klass: any, key: any) => {
      if (key) { klass = klass.constructor; }
      const metaTarget = klass[metaSym] = klass.hasOwnProperty(metaSym) ? klass[metaSym] : {};
      const store = metaTarget[storeSym] = metaTarget[storeSym] || {};
      if (key) {
        store[key] = fun(meta, klass, key);
      } else {
        decorator[klassesSym].push(klass);
        store[metaOnConstructor] = fun(meta, klass);
      }
    };
  };
  decorator[metaTypeSym] = storeSym;
  decorator[funNameSym] = funName;
  decorator[klassesSym] = [];
  return decorator;
}
export function loadDecoratorData<T, K>(decorator: { [metaTypeSym]: [T, K] }, klass: Type<T>): K;
export function loadDecoratorData<T, K, M>(decorator: { [metaTypeSym]: [T, K, M] }, klass: Type<T>, key: M): K;
export function loadDecoratorData(decorator: any, klass: any, key?: any) {
  key = key || metaOnConstructor;
  const storeSym = decorator[metaTypeSym];
  const store = recursive(
    klass,
    (current: any) => {
      if (current === Object) {
        return current;
      } else {
        return Object.getPrototypeOf(current.prototype).constructor
      }
    },
    current => current,
  ).filter(klass => klass.hasOwnProperty(metaSym))
    .map(klass => klass[metaSym][storeSym])
    .filter(store => store !== undefined)
    .find(store => key in store)
  if (store === undefined) {
    if (key === metaOnConstructor) {
      throw new NotDecoratedError(`${klass.name}:${decorator[funNameSym]}`);
    } else {
      throw new NotDecoratedError(`${klass.name}.${String(key)}:${decorator[funNameSym]}`);
    }
  }
  return store[key];
}
export function decoratedKeys<T>(decorator: { [metaTypeSym]: [T, any, any] }, klass: Type<T>): Array<keyof T> {
  const storeSym: any = decorator[metaTypeSym];
  const arr = recursive(
    klass,
    (current: any) => {
      if (current === Object) {
        return current;
      } else {
        return Object.getPrototypeOf(current.prototype).constructor
      }
    },
    current => current,
  ).map((klass: any) => {
    if (!klass.hasOwnProperty(metaSym)) { return []; }
    const store = klass[metaSym][storeSym];
    return Object.keys(store || {})
  }).flat();
  return [...new Set(arr)] as any;
}
export function decoratedKlass<T>(decorator: { [klassesSym]: Type<T>[] }): Type<T>[] {
  return decorator[klassesSym];
}
export function isDecorated<T>(decorator: { [metaTypeSym]: [T, any, any] }, klass: Type<T>, key: any): boolean;
export function isDecorated<T>(decorator: { [metaTypeSym]: [T, any] }, klass: Type<T>): boolean;
export function isDecorated<T>(decorator: { [metaTypeSym]: any }, klass: Type<T>, key?: any) {
  key = key || metaOnConstructor;
  const storeSym = decorator[metaTypeSym];
  const store = recursive(
    klass,
    (current: any) => {
      if (current === Object) {
        return current;
      } else {
        return Object.getPrototypeOf(current.prototype).constructor
      }
    },
    current => current,
  ).filter(klass => klass.hasOwnProperty(metaSym))
    .map(klass => klass[metaSym][storeSym])
    .filter(store => store !== undefined)
    .find(store => key in store)
  return store !== undefined;
}
