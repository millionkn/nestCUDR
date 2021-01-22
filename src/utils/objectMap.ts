export function objectMap<T extends object, R>(object: T, mapFun: (value: T[Extract<keyof T, string>], key: Extract<keyof T, string>) => R): { [k in Extract<keyof T, string>]: R } {
  const ret: any = {};
  for (const key in object) {
    if (object.hasOwnProperty(key)) {
      const element = object[key];
      ret[key] = mapFun(element, key);
    }
  }
  return ret;
}