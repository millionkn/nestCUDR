export const ID = Symbol();
type IDT<T> = { [ID]: T };
export type ID<T = any> = string & IDT<T>;
export type UnpackId<T extends ID> = T extends ID<infer X> ? X : never;

export interface BaseEntity<T = any> {
  id: ID<T>;
}