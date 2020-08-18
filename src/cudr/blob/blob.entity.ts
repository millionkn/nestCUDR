import { Entity, Column } from "typeorm";
import { CudrBaseEntity } from "../CudrBase.entity";

@Entity()
export class BlobEntity extends CudrBaseEntity {
  @Column({ type: 'longblob', select: false })
  blob!: Buffer
}