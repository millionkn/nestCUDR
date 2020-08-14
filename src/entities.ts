import { Entity, Column } from "typeorm"
import { CudrBaseEntity, CudrEntity } from "./cudr/cudr.module"
import { AccountRelated } from "./auth/authEntities"
import { GlobalRepository } from "./repository/repository.module"

@AccountRelated()
@Entity()
@GlobalRepository()
@CudrEntity({
})
export class UserEntity extends CudrBaseEntity {
  @Column()
  name!: string
}