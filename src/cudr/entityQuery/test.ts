import { entityQuery } from "./entityQuery";
import { PrimaryKey } from "./types";
import { TableEntity } from "./TableEntity";

export class A extends TableEntity<'A'> {
  num1!: number & PrimaryKey
  num2?: number & PrimaryKey
  num3!: number
  num4?: number
  num5!: (number & PrimaryKey) | null
  num6?: (number & PrimaryKey) | null
  num7!: (number) | null
  num8?: (number) | null
  a1!: A & PrimaryKey
  a2?: A & PrimaryKey
  a3!: (A & PrimaryKey) | null
  a4?: (A & PrimaryKey) | null
}

const x = entityQuery(A, {
  num1: ({ ref }) => ref((e) => e.num1),
  num2: ({ ref }) => ref((e) => e.num2),
  num3: ({ ref }) => ref((e) => e.num3),
  num4: ({ ref }) => ref((e) => e.num4),
  num5: ({ ref }) => ref((e) => e.num5),
  num6: ({ ref }) => ref((e) => e.num6),
  num7: ({ ref }) => ref((e) => e.num7),
  num8: ({ ref }) => ref((e) => e.num8),
  a: ({ ref }) => ref((e) => e),
})
  .byProperty((body) => body.num1).filter({ lessOrEqual: 12 }).assert('allowNull')
  .byProperty((body) => body.num2).filter({ lessOrEqual: 12 }).assert('allowNull')
  .byProperty((body) => body.num3).filter({ lessOrEqual: 12 }).assert('allowNull')
  .byProperty((body) => body.num4).filter({ lessOrEqual: 12 }).assert('allowNull')
  .byProperty((body) => body.num5).filter({ lessOrEqual: 12 }).assert('allowNull')
  .byProperty((body) => body.num6).filter({ lessOrEqual: 12 }).assert('allowNull')
  .byProperty((body) => body.num7).filter({ lessOrEqual: 12 }).assert('allowNull')
  .byProperty((body) => body.num8).filter({ lessOrEqual: 12 }).assert('allowNull')
  .byProperty((body) => body.a).filter({ equal: new A() }).assert('notNull')
  .bySequence((body) => body.num1, (body) => body.a).equal([789, new A()])
  .query({} as any)