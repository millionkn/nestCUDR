import './entities';
import { Module, Global } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { CudrModule } from './cudr/cudr.module';
import { RepositoryModule } from './repository/repository.module';
import { BusinessModule } from './business/Business.module';

// APPmodule的导出可以被全局使用
@Global()
@Module({
  imports: [
    AuthModule.factory(),
    CudrModule.factory(),
    RepositoryModule.factory(),
    BusinessModule,
  ],
  exports: [
    AuthModule,
    CudrModule,
    RepositoryModule,
  ],
})
export class AppModule { }
