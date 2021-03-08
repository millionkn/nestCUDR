import { CudrBaseEntity } from "./CudrbaseEntity";
import { Type } from "@nestjs/common";
import { ColumnPoint } from "./queryFuns/factory/ColumnPoint";
import { ID } from "@/utils/types";
import { ref } from "./queryFuns/ref";


export function tableQuery<Entity extends CudrBaseEntity, Template extends { [key: string]: ColumnPoint<Entity, any> }>(klass: Type<Entity>, template: Template) { }

class A implements CudrBaseEntity<'A'>{
  id!: ID<'A'>;
  arr!: number[] | null
  a!: A
}

tableQuery(A, {
  test: ref((e) => e.a.arr),
})