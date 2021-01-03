import { Entity, Column, ManyToOne, OneToMany, ManyToMany, JoinTable, PrimaryColumn, CreateDateColumn } from "typeorm"
import { GlobalRepository } from "@/repository/repository.module"
import { CudrBaseEntity, CudrEntity } from "@/cudr/CudrBaseEntity"
import { AuthableEntity } from "@/auth/entities"

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
  @JoinTable()
  @ManyToMany(() => TGroupEntity, (obj) => obj.users, { cascade: true })
  groups!: TGroupEntity[];
  @Column({ name: 'num' })
  num23!: number;
}

@Entity()
@GlobalRepository()
@CudrEntity()
export class TGroupEntity extends CudrBaseEntity<'TGroupEntity'> {
  @PrimaryColumn()
  name!: string
  @ManyToMany(() => UserEntity, (obj) => obj.groups)
  users!: UserEntity[];
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

@Entity()
@GlobalRepository()
@CudrEntity()
export class RequirementLogEntity extends CudrBaseEntity<'RequirementLogEntity'> {
  @CreateDateColumn({ primary: true })
  date!: Date;
  @ManyToOne(() => UserRequirementEntity, { primary: true })
  requirement!: UserRequirementEntity;

  @Column()
  name!: string;
}
