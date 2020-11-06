import { DynamicModule, Module, FactoryProvider } from '@nestjs/common';
import { getRepositoryToken, TypeOrmModule } from '@nestjs/typeorm';
import { loadDecoratedKlass, loadDecoratorData } from 'src/utils/decorator';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UserType } from './decorators';
import { AuthGateway } from './auth.gateway';
import { Repository } from 'typeorm';
import { AccountEntity } from './authEntities';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AccountEntity,
    ])
  ],
  providers: [
    AuthGateway,
  ],
  controllers: [
    AuthController,
  ],
})
export class AuthModule {
  static factory(): DynamicModule {
    const authServiceProviders = loadDecoratedKlass(UserType).map((klass): FactoryProvider<any> => {
      const info = loadDecoratorData(UserType, klass);
      return {
        provide: info.injectSym,
        useFactory: (repository: Repository<any>) => new AuthService(repository, klass, info),
        inject: [
          getRepositoryToken(klass),
        ],
      }
    });
    return {
      module: AuthModule,
      providers: [
        ...authServiceProviders,
      ],
      exports: [
        ...authServiceProviders.map((p) => p.provide),
      ],
    }
  }
}
