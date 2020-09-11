const keyLoaderProxy = new Proxy<any>({}, {
  get(target, key) {
    return key;
  }
})
export function getTagetKey(fun: (obj: any) => any):string {
  return fun(keyLoaderProxy);
}