import { Module, DynamicModule } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountEntity, GroupEntity, RoleEntity } from './authEntities';
import { SocketAuthService } from './socket-auth.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AccountEntity,
      GroupEntity,
      RoleEntity,
    ])
  ],
  controllers: [
    AuthController,
  ],
  providers: [
    SocketAuthService,
  ]
})
export class AuthModule {
  static factory(): DynamicModule {
    return {
      module: AuthModule,
    }
  }
}
