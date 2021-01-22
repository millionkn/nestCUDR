import { BaseEntityKlass } from "./BaseEntityKlass"
import { Cover } from "./types"

class B extends BaseEntityKlass {
  n!: number
}

class A extends BaseEntityKlass {
  obj1!: B
  obj2!: B | null
  obj3?: B
  a!: number
  b(): number {
    return 1;
  }
}

type Type1 = Cover<A, false, false>;

const t1: Type1 = {} as any;
t1.b();
const t2: true = {} as any as (Type1 extends { obj1: any } ? false : true)