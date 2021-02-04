const BaseEntitySym = Symbol();
export class BaseEntityKlass<T> {
  [BaseEntitySym]: {
    name: 'entity',
    type: T,
  }
}