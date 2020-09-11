export const ID = Symbol();
type IDT<T> = { [ID]: T };
export type ID<T = any> = string & IDT<T>

export interface BaseEntity<T = any> {
  id: ID<T>;
  createDate: Date;
}