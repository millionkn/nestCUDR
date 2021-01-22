import { EntityManager } from "typeorm";
import { TableQueryBody, QueryResult } from "./types";

export class SubTableQuery<Body extends TableQueryBody> {
  constructor(
    private queryBody: Body,
  ) { }
  query(
    manager: EntityManager,
    opt?: { skip: number, take: number },
  ): Promise<QueryResult<Body>[]> {
    throw new Error();
  }
  count(
    manager: EntityManager,
  ): Promise<number> {
    throw new Error();
  }
}