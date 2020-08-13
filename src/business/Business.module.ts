import { Module } from "@nestjs/common";
import { BusinessController } from "./Business.controller";

@Module({
  controllers: [
    BusinessController,
  ]
})
export class BusinessModule {
}