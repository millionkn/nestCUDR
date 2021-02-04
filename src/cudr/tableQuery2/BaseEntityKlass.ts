const CudrBaseEntitySym = Symbol();
export class BaseEntityKlass<T> {
  [CudrBaseEntitySym]: {
    name: 'entity',
    type: T,
  }
}