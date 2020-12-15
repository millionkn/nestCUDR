import { Injectable, Inject } from "@nestjs/common";
import { InjectConnection } from "@nestjs/typeorm";
import { Connection, InsertEvent, EntitySubscriberInterface } from "typeorm";
import { CudrBaseEntity } from "@/cudr/CudrBase.entity";
import * as dayjs from "dayjs";

export const MACHINE_CODE = 'MACHINE_CODE';

@Injectable()
export class GenerateIdService implements EntitySubscriberInterface<any> {
  private autoNumber = 0;
  constructor(
    @InjectConnection() connection: Connection,
    @Inject(MACHINE_CODE) private machineCode: number,
  ) {
    connection.subscribers.push(this);
  }
  beforeInsert(event: InsertEvent<CudrBaseEntity>) {
    if (!event.entity) { return }
    if (event.entity.id) { return; }
    const num = `000000${this.autoNumber++}`.substr(-6, 6);
    const dateStr = dayjs().format('YYYYMMDDHHmmss');
    event.entity.id = `${dateStr}:${this.machineCode}:${num}` as any;
  }
}