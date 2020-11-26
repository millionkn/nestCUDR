import { Entity, Column, OneToOne, JoinColumn, ManyToOne, OneToMany, ManyToMany, JoinTable } from "typeorm"
import { GlobalRepository } from "./repository/repository.module"
import { AccountEntity } from "./auth/authEntities"
import { CudrBaseEntity } from "./cudr/CudrBase.entity"
import { DeepQuery, CudrEntity, QueryTransformer } from "./cudr/decorators"
import { UserType, AccountRef } from "./auth/decorators"

@Entity()
@GlobalRepository()
@CudrEntity()
@UserType()
export class UserEntity extends CudrBaseEntity<'UserEntity'> {
  @Column()
  name!: string
  @Column()
  username!: string;
  @QueryTransformer({
    fromClient: () => undefined,
  })
  @AccountRef()
  @OneToOne(() => AccountEntity, {})
  @JoinColumn()
  account!: AccountEntity
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
  user!: UserEntity | null
  @OneToOne(() => RequirementLogEntity)
  @JoinColumn()
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
