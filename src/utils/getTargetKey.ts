
export function getTagetKey(fun: (obj: any) => any) {
  const paths: string[] = []
  const keyLoaderProxy: any = new Proxy<any>({}, {
    get(target, key) {
      if (typeof key !== 'string') { throw new Error('不能使用number或symbol') }
      paths.push(key);
      return keyLoaderProxy;
    }
  })
  fun(keyLoaderProxy);
  return paths;
}