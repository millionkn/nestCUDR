const JSONStrSym = Symbol();

interface JSONStr<T> extends String {
  [JSONStrSym]: {
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
declare interface Array<T> {
  duplicateRemoval(fun?: (a: T) => any): T[]
}
Array.prototype.duplicateRemoval = function (this, fun) {
  const set = new Set<any>();
  const saved: any[] = [];
  if (fun) {
    this.forEach((a) => {
      const key = fun(a);
      if (!set.has(key)) {
        saved.push(a);
        set.add(key);
      }
    });
  } else {
    this.forEach((a) => {
      if (!set.has(a)) {
        saved.push(a);
        set.add(a);
      }
    });
  }
  return saved;
}