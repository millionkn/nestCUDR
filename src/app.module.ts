import './entities';
import { Module, Global } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { CudrModule } from './cudr/cudr.module';
import { RepositoryModule } from './repository/repository.module';
import { BusinessModule } from './business/Business.module';
import { APP_GUARD } from '@nestjs/core';
import { AuthGuard } from './auth/auth.guard';

// APPmodule的导出可以被全局使用
@Global()
@Module({
  imports: [
    AuthModule.factory(),
    CudrModule.factory(),
    RepositoryModule.factory(),
    BusinessModule,
  ],
  providers:[
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
  ],
  exports: [
    AuthModule,
    CudrModule,
    RepositoryModule,
  ],
})
export class AppModule { }
