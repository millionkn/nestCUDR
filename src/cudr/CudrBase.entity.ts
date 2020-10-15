import { CreateDateColumn, Entity, PrimaryGeneratedColumn, Index } from "typeorm";
import { QueryTag } from "./decorators";
import { BaseEntity, ID } from "src/utils/entity";

@Entity()
export class CudrBaseEntity<T = any> implements BaseEntity<T> {
  @PrimaryGeneratedColumn('uuid')
  @Index()
  @QueryTag({
    type: () => ID
  })
  id!: ID<T>;
  @QueryTag({
    type: () => Date
  })
  @Index()
  @CreateDateColumn()
  createDate!: Date
}
