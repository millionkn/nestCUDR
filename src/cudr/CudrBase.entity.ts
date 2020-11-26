import { Entity, Index, PrimaryColumn } from "typeorm";
import { QueryType } from "./decorators";
import { BaseEntity, ID } from "src/utils/entity";

@Entity()
export class CudrBaseEntity<T = any> implements BaseEntity<T> {
  @PrimaryColumn('varchar', { length: 20 })
  @Index({ unique: true })
  @QueryType({ type: ID })
  id!: ID<T>;
}
