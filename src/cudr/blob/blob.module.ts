import { Module } from "@nestjs/common";
import { BlobController } from "./blob.controller";
import { BlobService } from "./blob.service";
import { TypeOrmModule } from "@nestjs/typeorm";
import { BlobEntity } from "./blob.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([BlobEntity]),
  ],
  controllers: [BlobController],
  providers: [BlobService]
})
export class BlobModule { }
