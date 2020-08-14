import { Entity, Column, OneToOne, JoinColumn } from "typeorm"
import { CudrBaseEntity, CudrEntity, PrivateColumn } from "./cudr/cudr.module"
import { GlobalRepository } from "./repository/repository.module"
import { AccountEntity } from "./auth/authEntities"

@Entity()
@GlobalRepository()
@CudrEntity({
})
export class UserEntity extends CudrBaseEntity {
  @Column()
  name!: string
  @PrivateColumn()
  @OneToOne(() => AccountEntity)
  @JoinColumn()
  account!: AccountEntity
}