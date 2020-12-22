const sym = Symbol();
export type SpecialType<T, name extends string, sym = never> = {
  [sym]: {
    type: T,
    name: name,
    sym: sym,
  }
}