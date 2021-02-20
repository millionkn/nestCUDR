import { _PickOnValueIs } from "@/utils/types";
import { TableEntity } from "./TableEntity";

const PrimaryKeySymbol = Symbol();
export type PrimaryKey = { [PrimaryKeySymbol]: true };
type _PrimaryKey<T> = T & PrimaryKey;
export type _UnpackPrimaryKey<T> = T extends _PrimaryKey<infer X> ? X : T;


export type UTN<T extends TableEntity> = { [key in keyof Required<T>]: T[key] extends undefined ? null : T[key] }
export type _UTN<T extends TableEntity> = {} & { [key in keyof Required<T>]: T[key] extends undefined ? null : T[key] }

export type PrimaryEntity<Entity extends TableEntity> = {
  [key in keyof _PickOnValueIs<Entity, PrimaryKey | null | undefined>]
  : Entity[key] extends TableEntity
  ? PrimaryEntity<_UnpackPrimaryKey<Entity[key]>>
  : _UnpackPrimaryKey<Entity[key]>
};
export type _PrimaryEntity<Entity extends TableEntity> = {} & {
  [key in keyof _PickOnValueIs<Entity, PrimaryKey | null | undefined>]
  : Entity[key] extends TableEntity
  ? PrimaryEntity<_UnpackPrimaryKey<Entity[key]>>
  : _UnpackPrimaryKey<Entity[key]>
};