import { Entity, Column, OneToOne, ManyToOne, OneToMany, ManyToMany, JoinTable, JoinColumn } from "typeorm"
import { GlobalRepository } from "./repository/repository.module"
import { CudrBaseEntity } from "./cudr/CudrBase.entity"
import { DeepQuery, CudrEntity } from "./cudr/decorators"

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
  @Column({ name: 'num' })
  num23!: number;
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
  user!: null | UserEntity
  @OneToOne(() => RequirementLogEntity)
  @JoinColumn()
  @DeepQuery()
  lastLog!: InstanceType<typeof RequirementLogEntity>
  @Column({ name: 'test2' })
  test!: string;
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
