import { BaseEntityKlass } from "./BaseEntityKlass";
import { QueryTable, QueryResult } from "./types";

export type ExtraTable<Body extends QueryTable, JoinTarget extends BaseEntityKlass> = {
  dependsOn(): Array<keyof JoinTarget>
  cover(entity: { [key in keyof JoinTarget]?: JoinTarget[key] }): Promise<QueryResult<Body>[]>
}