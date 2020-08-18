import * as moment from "moment";
import { CreateDateColumn, Entity, PrimaryGeneratedColumn } from "typeorm";
import { ID } from "src/utils";

@Entity()
export class CudrBaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: ID;
  @TransformerFrom((str: string) => moment(str, 'YYYY-MM-DD HH:mm:ss'))
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
export function loadTransformerFrom(prototype: any): Map<string, (value: any) => any> {
  if (!Reflect.hasMetadata(loadTransformerFrom, prototype)) {
    Reflect.defineMetadata(loadTransformerFrom, new Map(), prototype);
  }
  return Reflect.getMetadata(loadTransformerFrom, prototype);
}
/**到前端去 */
export function TransformerTo(fun: (value: any) => any) {
  return (prototype: any, key: string) => {
    loadTransformerTo(prototype).set(key, fun);
  }
}
/**从前端来 */
export function TransformerFrom(fun: (value: any) => any) {
  return (prototype: any, key: string) => {
    loadTransformerFrom(prototype).set(key, fun);
  }
}