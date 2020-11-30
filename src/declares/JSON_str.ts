const sym = Symbol();

declare interface JSONStr<T> extends String {
  [sym]: T
}

declare interface JSON {
  parse<T>(jsonStr: JSONStr<T>): T
}