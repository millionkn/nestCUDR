const sym = Symbol();
export class TableEntity<T = any>{
  [sym]: T
}