import { CreateDateColumn, Entity, PrimaryGeneratedColumn, Index } from "typeorm";
import { QueryType, QueryTransformer } from "./decorators";
import { BaseEntity, ID } from "src/utils/entity";
import dayjs from "dayjs";

@Entity()
export class CudrBaseEntity<T = any> implements BaseEntity<T> {
  @PrimaryGeneratedColumn('uuid')
  @Index()
  @QueryType({ type: ID })
  id!: ID<T>;
  @QueryTransformer({
    toClient: (date: Date) => dayjs(date).format('YYYY-MM-DD HH:mm:ss'),
    fromClient: (str: string) => dayjs(str, 'YYYY-MM-DD HH:mm:ss').toDate(),
  })
  @Index()
  @CreateDateColumn()
  createDate!: Date
}
