import { Entity, Column, Index } from "typeorm";
import { CudrBaseEntity } from "@/cudr/CudrBase.entity";

@Entity()
export class AccountEntity extends CudrBaseEntity {
  @Column()
  targetId!: string
  @Column()
  tableName!: string;
  @Column()
  password!: string;
  @Column()
  salt!: string;
}