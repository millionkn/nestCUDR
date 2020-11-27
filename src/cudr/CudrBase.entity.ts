import { Entity, Index, PrimaryColumn } from "typeorm";
import { QueryType } from "./decorators";
import { BaseEntity, ID } from "src/utils/entity";

@Entity()
export class CudrBaseEntity<T = any> implements BaseEntity<T> {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  @Index()
  @QueryType({ type: ID })
  id!: ID<T>;
}
