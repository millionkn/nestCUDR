import { Entity, Column, ManyToOne, OneToMany, ManyToMany, JoinTable, PrimaryColumn, CreateDateColumn, PrimaryGeneratedColumn } from "typeorm"
import { GlobalRepository } from "@/repository/repository.module"
import { AuthableEntity } from "@/auth/entities"
import { BaseEntityKlass } from "@/cudr/tableQuery/BaseEntityKlass"

@Entity()
@GlobalRepository()
export class GroupEntity extends BaseEntityKlass<'GroupEntity'> {
  @PrimaryGeneratedColumn('increment')
  id!: number;
}

@Entity()
@GlobalRepository()
export class UserEntity extends AuthableEntity<'UserEntity'> {
  @Column()
  name!: string
  @Column()
  username!: string;
  @OneToMany(() => UserRequirementEntity, (req) => req.user)
  requirements!: UserRequirementEntity[];
  @ManyToOne(() => GroupEntity)
  group!: GroupEntity;
}
@Entity()
@GlobalRepository()
export class UserRequirementEntity extends BaseEntityKlass<'UserRequirementEntity'> {
  @CreateDateColumn({ primary: true })
  date!: Date;

  @ManyToOne(() => UserEntity, { primary: true })
  user!: null | UserEntity
}