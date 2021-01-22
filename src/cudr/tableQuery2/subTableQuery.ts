import { CudrBaseEntity } from "../CudrBaseEntity";
import { TableQueryBody } from "./types";

const SubTableQuerySym = Symbol();
export type SubTableQuery<Entity extends CudrBaseEntity, Body extends TableQueryBody<Entity>, Out extends CudrBaseEntity> = {
  [SubTableQuerySym]: {
    type: {
      klass: Entity
      body: Body,
      outType: Out,
    }
  }
}