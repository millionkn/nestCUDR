const IDSym = Symbol();

export interface ID<T = any> {
  [IDSym]: {
    name: 'id',
    type: T,
  }
}