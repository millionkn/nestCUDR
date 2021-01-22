const CudrBaseEntitySym = Symbol();
export class CudrBaseEntity<T = any> {
  [CudrBaseEntitySym]: {
    name: 'entity',
    type: T,
  }
}