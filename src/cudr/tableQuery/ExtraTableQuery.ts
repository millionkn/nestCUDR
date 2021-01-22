import { BaseEntityKlass } from "./BaseEntityKlass";
import { TableQueryBody, NoInterface } from "./types";

export type ExtraTableQuery<Entity extends BaseEntityKlass, Body extends TableQueryBody, Out extends BaseEntityKlass> = NoInterface<{
}>