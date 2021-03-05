import { ID } from "@/utils/types";

export interface CudrBaseEntity<T = any>{
  id: ID<T>;
}