import { DynamicModule, Module, Type } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { DiscoveryModule } from "@nestjs/core";
import { createKlassDecorator, loadDecoratedKlass } from "@/utils/decorator";

/**
自动添加到TypeOrmModule.forFeature中

被修饰的实体会在全局模块产生对应的Response
*/
export const GlobalRepository = createKlassDecorator(`GlobalRepository`, () => () => { })

/**
功能是允许其他模块无需导入即可使用各个实体的Response
*/
@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: 'cdb-ej3i0pns.bj.tencentcdb.com',
      port: 10039,
      username: 'atest',
      password: 'Root1234',
      database: 'background',
      synchronize: true,
      autoLoadEntities: true,
      logging: [
        'error',
      ]
    }),
    DiscoveryModule,
  ],
  providers: [
  ],
})
export class RepositoryModule {
  static factory(
  ): DynamicModule {
    return {
      module: RepositoryModule,
      providers: [
      ],
      imports: [
        TypeOrmModule.forFeature(loadDecoratedKlass(GlobalRepository)),
      ],
      exports: [
        TypeOrmModule,
      ]
    }
  }
}
