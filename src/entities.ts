import { Entity, Column, OneToOne, JoinColumn, ManyToOne } from "typeorm"
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
}

@Entity()
@GlobalRepository()
@CudrEntity({
})
export class TestEntity extends CudrBaseEntity<'TestEntity'> {
  @Column()
  name!: string
  @ManyToOne(() => UserEntity)
  user!: UserEntity
  @OneToLastOne(() => Test2Entity, (obj) => obj.test)
  test2!: any
}

@Entity()
@GlobalRepository()
@CudrEntity({
})
export class Test2Entity extends CudrBaseEntity<'Test2Entity'> {
  @Column()
  name!: string
  @ManyToOne(() => TestEntity)
  test!: TestEntity;
}
