import { DynamicModule, Module, Type } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DiscoveryModule } from '@nestjs/core';
import { InsertCommitEmitterService } from './InsertCommitEmitter.service';

const klasses: any[] = []

/**
自动添加到TypeOrmModule.forFeature中

被修饰的实体会在全局模块产生对应的Response
*/
export function GlobalRepository(): ClassDecorator {

  return (klass) => { klasses.push(klass); }
}

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
      synchronize: false,
      autoLoadEntities: true,
      logging: [
        'query',
      ]
    }),
    DiscoveryModule,
  ],
  providers:[
    InsertCommitEmitterService,
  ],
})
export class RepositoryModule {
  static factory(): DynamicModule {
    return {
      module: RepositoryModule,
      imports: [
        TypeOrmModule.forFeature(klasses),
      ],
      exports: [
        TypeOrmModule,
      ]
    }
  }
}
