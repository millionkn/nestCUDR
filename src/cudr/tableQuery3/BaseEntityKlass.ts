const CudrBaseEntitySym = Symbol();
export class BaseEntityKlass<T = any> {
  [CudrBaseEntitySym]: {
    name: 'entity',
    type: T,
  }
}