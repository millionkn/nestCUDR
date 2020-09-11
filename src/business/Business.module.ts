import { Module } from "@nestjs/common";
import { BusinessController } from "./Business.controller";

@Module({
  providers:[
  ],
  controllers: [
    BusinessController,
  ]
})
export class BusinessModule {
}