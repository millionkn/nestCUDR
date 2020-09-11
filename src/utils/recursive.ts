export function recursive<T, K>(
  start: T,
  nextFun: (current: T) => T,
  retFun: (current: T, index: number, arr: T[]) => K,
  isSame: (a: T, b: T) => boolean = (a, b) => a === b,
) {
  const saved: T[] = [];
  while (saved.findIndex((save) => isSame(save, start)) === -1) {
    saved.push(start);
    start = nextFun(start);
  }
  return saved.map(retFun);
}