import { Entity, OneToOne, JoinColumn, Column, ManyToOne } from "typeorm"
import { CudrBaseEntity, CudrEntity } from "./cudr/cudr.module"
import { AccountEntity } from "./auth/authEntities"
import { GlobalRepository } from "./repository/repository.module"
import { SuperAdminGuard } from "./superAdmin.guard"

@Entity()
@GlobalRepository()
@CudrEntity({
  guards: () => [SuperAdminGuard]
})
export class UserEntity extends CudrBaseEntity {
  @OneToOne(() => AccountEntity)
  @JoinColumn()
  account!: AccountEntity
  @Column()
  name!:string
}