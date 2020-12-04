const JSONStrSym = Symbol();

declare interface JSONStr<T> extends String {
  [JSONStrSym]: T
}

declare interface JSON {
  parse<T>(jsonStr: JSONStr<T>): T
}