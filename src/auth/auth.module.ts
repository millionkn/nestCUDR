import { DynamicModule, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { loadDecoratedKlass, loadDecoratorData } from 'src/utils/decorator';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AccountEntity } from './authEntities';
import { UserType } from './decorators';
import { AuthControllerInfoMap, AuthControllerMapSym } from './tools';
import { getTagetKey } from 'src/utils/getTargetKey';
import { AuthGateway } from './auth.gateway';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AccountEntity,
    ])
  ],
  providers: [
    AuthService,
    AuthGateway,
  ],
  exports: [
    AuthService,
  ],
  controllers: [
    AuthController,
  ],
})
export class AuthModule {
  static factory(): DynamicModule {
    return {
      module: AuthModule,
      providers: [
        {
          provide: AuthControllerMapSym,
          useFactory: () => {
            const authMap: AuthControllerInfoMap = new Map();
            loadDecoratedKlass(UserType).forEach((klass) => {
              const info = loadDecoratorData(UserType, klass);
              authMap.set(info.userType, {
                klass,
                accountKey: getTagetKey(info.accountRef),
                usernameKey: getTagetKey(info.usernameRef),
              });
            });
            return authMap;
          }
        }
      ],
    }
  }
}
