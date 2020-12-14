import { DynamicModule, Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { AuthGateway } from "./auth.gateway";
import { AccountEntity } from "./authEntities";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AccountEntity,
    ])
  ],
  providers: [
    AuthGateway,
    AuthService,
  ],
  controllers: [
    AuthController,
  ],
  exports:[
    AuthService,
  ]
})
export class AuthModule {
  static factory(): DynamicModule {
    return {
      module: AuthModule,
    }
  }
}
