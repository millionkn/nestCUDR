export type _PartialKeys<T> = Extract<Exclude<{ [key in keyof T]: undefined extends T[key] ? key : never }[keyof T], { [key in keyof T]: undefined extends Required<T>[key] ? key : never }[keyof T]>, keyof T>

export type PickOnPartial<T> = { [key in _PartialKeys<T>]?: T[key] }
export type _PickOnPartial<T> = { [key in _PartialKeys<T>]?: T[key] } & {}
export type PickOnRequired<T> = { [key in Exclude<keyof T, _PartialKeys<T>>]: T[key] }
export type _PickOnRequired<T> = { [key in Exclude<keyof T, _PartialKeys<T>>]: T[key] } & {}

export type _Pick<T, key extends keyof T> = any extends any ? { [k in key]: T[k]; } : never;

export type _KeysOnValueIs<T, V> = Exclude<{ [key in keyof T]: T[key] extends V ? key : never }[keyof T], undefined>;
export type KeysOnValueIs<T, V> = _KeysOnValueIs<T, V> & {};

export type _KeysOnValueNotIs<T, V> = Exclude<{ [key in keyof T]: T[key] extends V ? never : key }[keyof T], undefined>;
export type KeysOnValueNotIs<T, V> = _KeysOnValueNotIs<T, V> & {};

export type _PickOnValueIs<T, V> = _Pick<T, _KeysOnValueIs<T, V>>
export type PickOnValueIs<T, V> = { [key in keyof _PickOnValueIs<T, V>]: _PickOnValueIs<T, V>[key] }

export type _PickOnValueNotIs<T, V> = _Pick<T, _KeysOnValueNotIs<T, V>>
export type PickOnValueNotIs<T, V> = { [key in keyof _PickOnValueNotIs<T, V>]: _PickOnValueNotIs<T, V>[key] }

export type PickOnString<T> = { [key in Extract<keyof T, string>]: T[key] }
export type _PickOnString<T> = { [key in Extract<keyof T, string>]: T[key] } & {}

export type PickOnNumber<T extends any[]> = { [key in Extract<keyof T, number>]: T[key] }
export type _PickOnNumber<T extends any[]> = { [key in Extract<keyof T, number>]: T[key] } & {}

const IDSym = Symbol();
export type ID<K = any> = { [IDSym]: K }
export function ID<T>(id: T): ID<T> {
  return id as any;
}