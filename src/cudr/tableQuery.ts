import { CudrBaseEntity } from "./CudrBase.entity";
import { Type } from "@nestjs/common";
import { ID } from "src/utils/entity";
import { UserRequirementEntity } from "src/entities";

const refSym = Symbol();

type Cover<T1, cudrNull extends boolean, cudrArray extends boolean,
  T2 = cudrArray extends true ? T1[] : T1,
  T3 = cudrNull extends true ? T2 | null : T2,
  > = T3
type Ref<T, cudrNull extends boolean, cudrArray extends boolean> = {
  [refSym]: Cover<T, cudrNull, cudrArray>
}

type Wrapper<T extends CudrBaseEntity, cudrNull extends boolean, cudrArray extends boolean> = {
  [key in keyof T]
  : T[key] extends Function ? never
  : T[key] extends CudrBaseEntity ? Wrapper<T[key], cudrNull, cudrArray>
  : T[key] extends CudrBaseEntity | null ? T[key] extends null | infer X ? X extends CudrBaseEntity ? Wrapper<X, true, cudrArray> : never : never
  : T[key] extends Array<infer X> ? X extends CudrBaseEntity ? Wrapper<X, cudrNull, true> : Ref<T[key], cudrNull, true>
  : Ref<T[key], cudrNull, cudrArray>
}

type Filter<T> = T extends ID ? { in: T[] }
  : T extends Date ? { lessOrEqual: string } | { moreOrEqual: string }
  : T extends number ? { lessOrEqual: number } | { moreOrEqual: number }
  : T extends string ? { like: string[] } | { like: string } | { equal: string, } | { in: string[] }
  : T extends boolean ? { equal: boolean }
  : 123
const loadSym = Symbol();
interface loadAble<T, cudrNull extends boolean, cudrArray extends boolean> {
  [loadSym]: Cover<T, cudrNull, cudrArray>;
}
type WrapperInput<E extends CudrBaseEntity> = Wrapper<E, false, false>

type TableQueryBodyOption<E extends CudrBaseEntity> = {
  [key: string]: (funs: {
    path: (
      <T, array extends boolean>(
        path: (entity: WrapperInput<E>) => T extends CudrBaseEntity ? Wrapper<T, false, array> : Ref<T, false, array>,
        defaultValue: void,
      ) => (loadAble<T, false, array>)
    ) & (
      <T, array extends boolean>(
        path: (entity: WrapperInput<E>) => T extends CudrBaseEntity ? Wrapper<T, true, array> : Ref<T, true, array>,
        defaultValue: T | null,
      ) => (loadAble<T, false, array>)
    );
    count: (
      (
        path: (entity: WrapperInput<E>) => Wrapper<CudrBaseEntity, false, true> | Ref<string, false, true> | Ref<ID, false, true>,
      ) => (loadAble<number, false, false>)
    ) & (
      <T>(
        path: (entity: WrapperInput<E>) => T extends CudrBaseEntity ? Wrapper<T, true, true> : Ref<T, true, true>,
        defaultValue: T | null,
      ) => (loadAble<number, false, false>)
    );
    sum: (
      (
        path: (entity: WrapperInput<E>) => Ref<number, false, true>,
      ) => (loadAble<number, false, false>)
    ) & (
      (
        path: (entity: WrapperInput<E>) => Ref<number, true, true>,
        defaultValue: number | null,
      ) => (loadAble<number, false, false>)
    );
    max: (
      (
        path: (entity: WrapperInput<E>) => Ref<number, false, true>,
      ) => (loadAble<number, false, false>)
    ) & (
      (
        path: (entity: WrapperInput<E>) => Ref<number, true, true>,
        defaultValue: number | null,
      ) => (loadAble<number, false, false>)
    );
    min: (
      (
        path: (entity: WrapperInput<E>) => Ref<number, false, true>,
      ) => (loadAble<number, false, false>)
    ) & (
      (
        path: (entity: WrapperInput<E>) => Ref<number, true, true>,
        defaultValue: number | null,
      ) => (loadAble<number, false, false>)
    );
    arv: (
      (
        path: (entity: WrapperInput<E>) => Ref<number, false, true>,
      ) => (loadAble<number, false, false>)
    ) & (
      (
        path: (entity: WrapperInput<E>) => Ref<number, true, true>,
        defaultValue: number | null,
      ) => (loadAble<number, false, false>)
    ),
  }) => loadAble<any, false, any>
}

type TableQueryBodyInput<E extends CudrBaseEntity,B extends TableQueryBodyOption<E>> = {
  [key in keyof B]: ReturnType<B[key]>
}
interface TableQueryBuilder<E extends CudrBaseEntity,B extends TableQueryBodyOption<any>> {
  filter: <T,Path extends (body: TableQueryBodyInput<E,B>) => loadAble<T, any, any>>(path: Path,filter:Filter<T>) => T
}

export function tableQuery<E extends CudrBaseEntity, B extends TableQueryBodyOption<E>>(klass: Type<E>, body: B): TableQueryBuilder<E,B> {
  throw new Error();
}

function x<T>(fun:()=>T,a:T):T{throw new Error()}


tableQuery(UserRequirementEntity, {
  username: ({ path }) => path((e) => e.lastLog.name),
}).filter((r) => r.username,{like:''})
