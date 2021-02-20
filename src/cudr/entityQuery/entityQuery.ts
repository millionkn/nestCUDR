import { _PickOnValueNotIs, _PickOnString } from "@/utils/types";
import { Type } from "@nestjs/common";
import { EntityManager } from "typeorm";
import { TODOError } from "./errors";
import { UTN, PrimaryEntity, _UnpackPrimaryKey } from "./types";
import { TableEntity } from "./TableEntity";


const hideSym = Symbol();

type Simple<T> = T extends TableEntity ? _PickOnString<_PickOnValueNotIs<UTN<T>, TableEntity | Array<TableEntity> | null | undefined | ((...args: any[]) => any)>> : T

type Resolve<T, isNull extends boolean, isArray extends boolean> = isArray extends true ? T[] : isNull extends true ? null | T : T;

type ColumnPoint<Entity extends TableEntity, T, isNull extends boolean, isArray extends boolean> = {
  [hideSym]: {
    __filterType?: () => T,
    __primaryType?: () => Resolve<T extends TableEntity ? PrimaryEntity<_UnpackPrimaryKey<T>> : _UnpackPrimaryKey<T>, isNull, isArray>
    __resultType?: () => Resolve<T extends TableEntity ? Simple<T> : T, isNull, isArray>
  }
}
type ColumnPointType<CP extends ColumnPoint<any, any, any, any>, name extends keyof CP[typeof hideSym]> = CP[typeof hideSym][name] extends (undefined | (() => infer F)) ? F : never
type Wrapper<Entity extends TableEntity, T, isNull extends boolean, isArray extends boolean> = ColumnPoint<Entity, T, isNull, isArray> & (T extends TableEntity ? {
  [key in keyof UTN<T>]
  : T[key] extends Function ? never
  : T[key] extends TableEntity ? Wrapper<Entity, T[key], isNull, isArray>
  : T[key] extends Array<infer X> ? Wrapper<Entity, X, isNull, true>
  : T[key] extends null | undefined | infer X ? Wrapper<Entity, X, null extends T[key] ? true : undefined extends T[key] ? true : isNull, isArray>
  : never
} : unknown)

type QueryFuns<Entity extends TableEntity> = {
  ref<CP extends ColumnPoint<Entity, any, boolean, boolean>>(path: (entity: Wrapper<Entity, Entity, false, false>) => CP): CP,
};

type QueryTemplate<Entity extends TableEntity> = { [key: string]: (funs: QueryFuns<Entity>) => ColumnPoint<Entity, any, boolean, boolean> }

type QueryTableBody<Entity extends TableEntity, Template extends QueryTemplate<Entity>> = {
  [key in Extract<keyof Template, string>]: ReturnType<Template[key]>
} & {};

type Filter<T> = null | undefined | (T extends Date ? { lessOrEqual?: Date, moreOrEqual?: Date }
  : T extends number ? { lessOrEqual?: number, moreOrEqual?: number, in?: number[], equal?: number }
  : T extends string ? { like?: string, equal?: string, in?: string[] }
  : T extends boolean ? { equal?: boolean }
  : T extends TableEntity ? { equal?: PrimaryEntity<T>, in?: PrimaryEntity<T>[] }
  : { equal?: T, in?: T[] });

interface TableBuilder<Entity extends TableEntity, Template extends QueryTemplate<Entity>> {
  byProperty<CP extends ColumnPoint<Entity, any, boolean, false>>(path: (body: QueryTableBody<Entity, Template>) => CP): {
    filter(filter: Filter<ColumnPointType<CP, '__filterType'>>): {
      assert(value: 'notNull' | 'allowNull' | 'isNull'): TableBuilder<Entity, Template>
    }
    sort(sortMode: 'DESC' | 'ASC' | undefined | null): {
      setNullOn(nullMode: "NULLS FIRST" | "NULLS LAST" | null | undefined): TableBuilder<Entity, Template>
    }
  }
  bySequence<Ts extends ColumnPoint<Entity, any, boolean, false>[]>(
    ...paths: { [index in keyof Ts]: (body: QueryTableBody<Entity, Template>) => Ts[index] }
  ): {
    equal(sequence: { [index in keyof Ts]: Ts[index] extends ColumnPoint<Entity, any, boolean, false> ? ColumnPointType<Ts[index], '__primaryType'> : Ts[index] }): TableBuilder<Entity, Template>,
    in(sequenceArr: { [index in keyof Ts]: Ts[index] extends ColumnPoint<Entity, any, boolean, false> ? ColumnPointType<Ts[index], '__primaryType'> : Ts[index] }[]): TableBuilder<Entity, Template>,
  }

  query(manager: EntityManager, opts?: {
    skip?: number,
    take?: number,
  }): Promise<{ [key in keyof Template]: ColumnPointType<ReturnType<Template[key]>, '__resultType'> }[]>;
  count(manager: EntityManager): Promise<number>;
}

export function entityQuery<
  Entity extends TableEntity,
  Template extends QueryTemplate<Entity>,
  >(
    klass: Type<Entity>,
    queryTemplate: Template,
): TableBuilder<Entity, Template> {
  throw new TODOError();
}
