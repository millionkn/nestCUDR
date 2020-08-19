import { Module, DynamicModule } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountEntity, GroupEntity, RoleEntity } from './authEntities';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AccountEntity,
      GroupEntity,
      RoleEntity,
    ])
  ],
  controllers: [AuthController],
})
export class AuthModule {
  static factory(): DynamicModule {
    return {
      module: AuthModule,
    }
  }
}
