import { Type } from "@nestjs/common";
import { CudrBaseEntity } from "./CudrBase.entity";
import { Subject } from "rxjs";
import { createCacheFun } from "src/utils/loadCache";
import { ID } from "src/utils/entity";

export const CudrEventSubject = createCacheFun(<T extends CudrBaseEntity<any>>(klass: Type<T>) => new Subject<
  | {
    type: 'insert',
    entity: T,
  } | {
    type: 'delete',
    entity: {
      [key in keyof T]: T[key] extends CudrBaseEntity<any> ? ID<T[key]['id']> : T[key]
    },
  }
>());
export const CudrEventObservable = createCacheFun(<T extends CudrBaseEntity<any>>(klass: Type<T>) => CudrEventSubject(klass).asObservable())