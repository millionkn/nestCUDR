import { SpecialType } from "./specialType";

export const ID = Symbol();
type IDT<T> = SpecialType<T, 'idType', typeof ID>;
export type ID<T = any> = string & IDT<T>;

export interface BaseEntity<T = any> {
  id: ID<T>;
}