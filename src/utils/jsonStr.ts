const JSONStrSym = Symbol();

export class JSONStr<T> extends String {
  [JSONStrSym]: {
    type: T,
  }
  static stringify<T>(obj: T): JSONStr<T> {
    return JSON.stringify(obj) as any
  }
  static parse<T>(str: JSONStr<T>): T {
    return JSON.parse(str as any);
  }
}