import { Module } from "@nestjs/common";
import { BusinessController } from "./Business.controller";
import { BusinessGateway } from "./business.gateway";

@Module({
  controllers: [
    BusinessController,
  ],
  providers:[
    BusinessGateway,
  ],
})
export class BusinessModule {
}