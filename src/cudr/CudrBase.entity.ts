import { CreateDateColumn, Entity, PrimaryGeneratedColumn } from "typeorm";
import { QueryTag } from "./decorators";
import { BaseEntity, ID } from "src/utils/entity";

@Entity()
export class CudrBaseEntity<T = any> implements BaseEntity<T> {
  @PrimaryGeneratedColumn('uuid')
  @QueryTag({
    type: () => ID
  })
  id!: ID<T>;
  @CreateDateColumn()
  createDate!: Date
}
