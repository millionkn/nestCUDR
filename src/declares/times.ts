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