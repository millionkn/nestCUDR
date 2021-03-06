import { Entity, Column, OneToOne, ManyToOne, OneToMany, ManyToMany, JoinTable } from "typeorm"
import { GlobalRepository } from "./repository/repository.module"
import { CudrBaseEntity } from "./cudr/CudrBase.entity"
import { DeepQuery, QueryLast, CudrEntity } from "./cudr/decorators"

@Entity()
@GlobalRepository()
@CudrEntity()
export class UserEntity extends CudrBaseEntity<'UserEntity'> {
  @Column()
  name!: string
  @Column()
  username!: string;
  @DeepQuery()
  @OneToMany(() => UserRequirementEntity, (req) => req.user)
  requirements!: UserRequirementEntity[];
  @JoinTable()
  @ManyToMany(() => TGroupEntity, (obj) => obj.users, { cascade: true })
  @DeepQuery()
  groups!: TGroupEntity[];
}

@Entity()
@GlobalRepository()
@CudrEntity()
export class TGroupEntity extends CudrBaseEntity<'TGroupEntity'> {
  @Column()
  name!: string
  @DeepQuery()
  @ManyToMany(() => UserEntity, (obj) => obj.groups)
  users!: UserEntity[];
}

@Entity()
@GlobalRepository()
@CudrEntity()
export class UserRequirementEntity extends CudrBaseEntity<'UserRequirementEntity'> {
  @DeepQuery()
  @ManyToOne(() => UserEntity)
  user!: UserEntity
  @OneToOne(() => RequirementLogEntity, (obj) => obj.requirement)
  @QueryLast()
  @DeepQuery()
  lastLog!: InstanceType<typeof RequirementLogEntity>
}

@Entity()
@GlobalRepository()
@CudrEntity()
export class RequirementLogEntity extends CudrBaseEntity<'RequirementLogEntity'> {
  @Column()
  name!: string
  @DeepQuery()
  @ManyToOne(() => UserRequirementEntity)
  requirement!: UserRequirementEntity;
}
