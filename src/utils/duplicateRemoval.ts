export function duplicateRemoval<T, K>(arr: T[], fun: (a: T) => any, retFun: (a: T) => K): K[];
export function duplicateRemoval<T, K>(arr: T[], fun: (a: T) => any): T[];
export function duplicateRemoval<T, K>(arr: T[], fun: (a: T) => any, retFun?: (a: T) => K) {
  if (retFun) {
    return [...new Set(arr.map(fun))].map(r => retFun(arr.find(t => fun(t) === r) as T));
  } else {
    return [...new Set(arr.map(fun))].map(r => arr.find(t => fun(t) === r) as T);
  }
}
