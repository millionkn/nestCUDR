import { Entity, Column, OneToOne, JoinColumn } from "typeorm"
import { CudrEntity, PrivateColumn } from "./cudr/cudr.module"
import { GlobalRepository } from "./repository/repository.module"
import { AccountEntity } from "./auth/authEntities"
import { UserType } from "./auth/Auth"
import { CudrBaseEntity } from "./cudr/CudrBase.entity"

@Entity()
@GlobalRepository()
@CudrEntity({
})
@UserType()
export class UserEntity extends CudrBaseEntity {
  @Column()
  name!: string
  @PrivateColumn()
  @OneToOne(() => AccountEntity)
  @JoinColumn()
  account!: AccountEntity
}