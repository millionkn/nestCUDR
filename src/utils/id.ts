const IDSym = Symbol();

export interface ID<T = any> extends String {
  [IDSym]: {
    name: 'id',
    type: T,
  }
}