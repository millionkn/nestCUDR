import { Entity, Column, PrimaryColumn, PrimaryGeneratedColumn } from "typeorm";
import { CudrBaseEntity } from "@/cudr/CudrBaseEntity";
import { ID } from "@/utils/id";

@Entity()
export class AccountEntity extends CudrBaseEntity {
  @PrimaryColumn()
  tableName!: string;
  @PrimaryColumn()
  targetId!: string
  @Column()
  password!: string;
  @Column()
  salt!: string;
}

@Entity()
export class AuthableEntity<T extends string> extends CudrBaseEntity<T>{
  @PrimaryGeneratedColumn('uuid')
  id!: ID<T>;
}