import { Entity, Column, OneToOne, JoinColumn, ManyToOne, OneToMany } from "typeorm"
import { CudrEntity, PrivateColumn } from "./cudr/cudr.module"
import { GlobalRepository } from "./repository/repository.module"
import { AccountEntity } from "./auth/authEntities"
import { UserType } from "./auth/Auth"
import { CudrBaseEntity } from "./cudr/CudrBase.entity"
import { OneToLastOne } from "./cudr/RightJoin.decorator"

@Entity()
@GlobalRepository()
@CudrEntity({
})
@UserType()
export class UserEntity extends CudrBaseEntity<'UserEntity'> {
  @Column()
  name!: string
  @OneToOne(() => AccountEntity)
  @JoinColumn()
  account!: AccountEntity
  @OneToMany(() => UserRequirementEntity, (req) => req.user)
  requirements!: UserRequirementEntity[];
}

@Entity()
@GlobalRepository()
@CudrEntity({
})
export class UserRequirementEntity extends CudrBaseEntity<'UserRequirementEntity'> {
  @ManyToOne(() => UserEntity)
  user!: UserEntity
  @OneToLastOne(() => RequirementLogEntity, (obj) => obj.requirement)
  lastLog!: InstanceType<typeof RequirementLogEntity>
}

@Entity()
@GlobalRepository()
@CudrEntity({
})
export class RequirementLogEntity extends CudrBaseEntity<'RequirementLogEntity'> {
  @Column()
  name!: string
  @ManyToOne(() => UserRequirementEntity)
  requirement!: UserRequirementEntity;
}
