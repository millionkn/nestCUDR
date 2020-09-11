const oneTimeSymbol = Symbol();
export function oneTimeFunc<T>(func: () => T): () => T {
  let result: any = oneTimeSymbol;
  return () => {
    if (result === oneTimeSymbol) { result = func() }
    return result;
  }
}