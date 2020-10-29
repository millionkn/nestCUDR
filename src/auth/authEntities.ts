import { Entity, Column, PrimaryGeneratedColumn } from "typeorm";
import { ID } from "src/utils/entity";

@Entity()
export class AccountEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: ID<'AccountEntity'>;
  @Column()
  password!: string;
  @Column()
  salt!: string;
}