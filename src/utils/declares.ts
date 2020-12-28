const typeSym = Symbol();

declare interface JSONStr<T> extends String {
  [typeSym]: {
    name: 'JSONStr',
    type: T,
  }
}
declare interface JSON {
  parse<T>(jsonStr: JSONStr<T>): T
}

declare interface Number {
  times<T>(fun: (i: number) => T): T[];
}
Number.prototype.times = function (this: number, fun) {
  const ret = new Array<any>();
  let i = 0;
  while (i < this) {
    ret.push(fun(i));
    i += 1;
  }
  return ret;
}

declare interface ID<T> extends String {
  [typeSym]: {
    name: 'id',
    type: T,
  }
}