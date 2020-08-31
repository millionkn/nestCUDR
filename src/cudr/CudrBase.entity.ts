import * as moment from "moment";
import { CreateDateColumn, Entity, PrimaryGeneratedColumn } from "typeorm";
import { ID, TypeFun } from "src/utils";

@Entity()
export class CudrBaseEntity<T> {
  @PrimaryGeneratedColumn('uuid')
  @TypeFun(() => ID)
  @Reflect.metadata('design:type', String)
  id!: ID<T>;
  @TransformerTo((date: Date) => moment(date).format('YYYY-MM-DD HH:mm:ss'))
  @CreateDateColumn()
  createDate!: Date
}

export function loadTransformerTo(prototype: any): Map<string, (value: any) => any> {
  if (!Reflect.hasMetadata(loadTransformerTo, prototype)) {
    Reflect.defineMetadata(loadTransformerTo, new Map(), prototype);
  }
  return Reflect.getMetadata(loadTransformerTo, prototype);
}
/**到前端去 */
export function TransformerTo(fun: (value: any) => any) {
  return (prototype: any, key: string) => {
    loadTransformerTo(prototype).set(key, fun);
  }
}