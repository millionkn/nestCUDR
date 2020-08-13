import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

@Entity()
export class BlobEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;
  @Column({ type: 'longblob', select: false })
  blob!: Buffer
}