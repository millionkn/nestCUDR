import { Entity, Column, ManyToOne, OneToMany, ManyToMany, JoinTable, PrimaryColumn, CreateDateColumn, PrimaryGeneratedColumn } from "typeorm"
import { GlobalRepository } from "@/repository/repository.module"
import { CudrBaseEntity, CudrEntity } from "@/cudr/CudrBaseEntity"
import { AuthableEntity } from "@/auth/entities"

@Entity()
@GlobalRepository()
@CudrEntity()
export class GroupEntity extends CudrBaseEntity<'GroupEntity'> {
  @PrimaryGeneratedColumn('increment')
  id!: number;
}

@Entity()
@GlobalRepository()
@CudrEntity()
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
@CudrEntity()
export class UserRequirementEntity extends CudrBaseEntity<'UserRequirementEntity'> {
  @CreateDateColumn({ primary: true })
  date!: Date;

  @ManyToOne(() => UserEntity, { primary: true })
  user!: null | UserEntity
}