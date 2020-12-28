import { Entity } from "typeorm";

@Entity()
export class CudrBaseEntity<T = any> {
  [typeSym]?: {
    name: 'entity',
    type: T,
  }
}
