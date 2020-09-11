const cacheSym = Symbol('cache');

export function createCacheFun<T, K>(initFun: (obj: T) => K) {
  const sym = Symbol();
  return (obj: T): K => {
    if (typeof obj === 'object') {
      if (obj === null) { throw new Error(`null不能使用cache`) }
    } else if (typeof obj !== 'function') {
      throw new Error(`基本类型不能使用cache`)
    }
    const cache = (obj as any)[cacheSym] = (obj as any)[cacheSym] || {};
    if (!(sym in cache)) {
      cache[sym] = initFun(obj);
    }
    return cache[sym];
  }
}