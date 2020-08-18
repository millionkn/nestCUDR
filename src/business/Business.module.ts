import { Module } from "@nestjs/common";
import { BusinessController } from "./Business.controller";
import { BusinessGateway } from "./business.gateway";

@Module({
  providers:[
    BusinessGateway
  ],
  controllers: [
    BusinessController,
  ]
})
export class BusinessModule {
}