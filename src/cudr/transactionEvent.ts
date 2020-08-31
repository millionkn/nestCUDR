import { Type } from "@nestjs/common";
import { CudrBaseEntity } from "./CudrBase.entity";
import { loadMetadata, ID } from "src/utils";
import { Subject } from "rxjs";

export function CudrEventSubject<T extends CudrBaseEntity<any>>(klass: Type<T>) {
  return loadMetadata(CudrEventSubject, () => new Subject<
    | {
      type: 'insert',
      entity: T,
    } | {
      type: 'delete',
      entity: {
        [key in keyof T]:T[key] extends CudrBaseEntity<any> ? ID<T[key]['id']> :T[key]
      },
    }
  >(), klass);
}

export function CudrInsertObservable<T extends CudrBaseEntity<any>>(klass: Type<T>) {
  return CudrEventSubject(klass).asObservable();
}