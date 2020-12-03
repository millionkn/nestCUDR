export const ID = Symbol();
type IDT<T> = { [ID]: T };
export type ID<T = any> = string & IDT<T>;
export type UnpackId<T extends ID> = T extends ID<infer X> ? X : never;

const BaseEntitySym = Symbol();

export interface BaseEntity<T = any> {
  [BaseEntitySym]: true
  id: ID<T>;
}