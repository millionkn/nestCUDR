import { DynamicModule, Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { AccountEntity } from "./entities";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AccountEntity,
    ])
  ],
  providers: [
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
