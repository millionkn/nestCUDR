import { tableQuery } from ".";
import { BaseEntityKlass } from "./BaseEntityKlass";

class A extends BaseEntityKlass<'A'>{
  aName!: string
  aNum!: number
  aSuperB!: B
  aExtracC!: C[]
  aSuperD?: D;
}

class B extends BaseEntityKlass<'B'>{
  bName!: string
  bNum!: number
}
class C extends BaseEntityKlass<'C'>{
  cName?: string
  cNum!: number
  cSuperaA!: A;
}
class D extends BaseEntityKlass<'D'>{
  dName!: string
  dNum!: number
}

const extra = tableQuery(C, {
  cName: ({ ref }) => ref((w) => w.cName)
}).asExtra(A, (e) => e.cSuperaA)

const builderA = tableQuery(A, {
  dName: ({ ref }) => ref((w) => w.aSuperD.dName),
  aNum: ({ ref }) => ref((w) => w.aNum),
  cExtra: ({ join }) => join(extra),
  dCount: ({ join }) => join(extra).count({
    column: (w) => w.cName,
    distinct: true,
  }),
}).query({} as any, {} as any).then(([result]) => {
  result.dName
  result.aNum
  const [c] = result.cExtra;



  c.cName
})