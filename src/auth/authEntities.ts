import { Entity, Column } from "typeorm";
import { CudrBaseEntity } from "src/cudr/CudrBase.entity";

@Entity()
export class AccountEntity extends CudrBaseEntity {
  @Column()
  password!: string;
  @Column()
  salt!: string;
}