import { PrimaryGeneratedColumn, Entity, Column, ManyToMany, JoinTable } from "typeorm";
import { CudrBaseEntity } from "src/cudr/CudrBase.entity";
import { ID } from "src/utils/entity";

@Entity()
export class AccountEntity extends CudrBaseEntity<'AccountEntity'> {
  @Column()
  username!: string;
  @Column({ select: false })
  password!: string;
  @ManyToMany(() => GroupEntity, { eager: true })
  @JoinTable()
  groups!: GroupEntity[]
}

@Entity()
export class GroupEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: ID<'GroupEntity'>;
  @Column()
  name!: string;
  @ManyToMany(() => RoleEntity, { eager: true })
  @JoinTable()
  roles!: RoleEntity[]
}

@Entity()
export class RoleEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: ID<'RoleEntity'>;
  @Column()
  name!: string;
}