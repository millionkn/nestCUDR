import { Injectable } from "@nestjs/common";
import { InjectConnection } from "@nestjs/typeorm";
import { Connection, InsertEvent, EntitySubscriberInterface } from "typeorm";
import { CudrBaseEntity } from "src/cudr/CudrBase.entity";
import * as dayjs from "dayjs";

@Injectable()
export class GenerateIdService implements EntitySubscriberInterface<any> {
  constructor(
    @InjectConnection() connection: Connection,
  ) {
    connection.subscribers.push(this);
  }
  beforeInsert(event: InsertEvent<CudrBaseEntity>) {
    if (event.entity.id) { return; }
    const randomNum = [...new Array(6)].map(() => Math.floor(Math.random() * 10)).join('');
    const dateStr = dayjs().format('YYYYMMDDHHmmss');
    event.entity.id = `${dateStr}${randomNum}` as any;
  }
}