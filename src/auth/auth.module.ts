import { Module, DynamicModule } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountEntity, GroupEntity, RoleEntity } from './authEntities';
import { AuthGateway } from './auth.gateway';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AccountEntity,
      GroupEntity,
      RoleEntity,
    ])
  ],
  providers: [
    AuthService,
    AuthGateway,
  ],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {
  static factory(): DynamicModule {
    return {
      module: AuthModule,
    }
  }
}
