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
  duplicateRemoval(fun: (a: T) => any): T[]
  groupBy<G>(groupFun: (obj: T) => G): [G, T[]][]
}
Array.prototype.duplicateRemoval = function (this, fun) {
  const map = new Set();
  const ret: any[] = [];
  this.forEach((t) => {
    const key = fun(t);
    if (!map.has(key)) {
      map.add(key);
      ret.push(t);
    }
  });
  return ret;
}
Array.prototype.groupBy = function groupBy<T, G>(this: T[], groupFun: (obj: T) => G): [G, T[]][] {
  const ret = new Map<G, T[]>();
  this.forEach((obj) => {
    const key = groupFun(obj);
    if (!ret.has(key)) { ret.set(key, []) }
    const arr = ret.get(key)!;
    arr.push(obj);
  });
  return [...ret.entries()];
};