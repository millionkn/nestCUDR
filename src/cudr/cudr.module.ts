import { Module, DynamicModule, Controller, Post, Body, Inject, BadRequestException } from '@nestjs/common';
import { BlobModule } from './blob/blob.module';
import { MissionListController } from './MissionList.controller';
import { loadDecoratedKlass, loadDecoratorData } from 'src/utils/decorator';
import { CudrEntity } from './decorators';
import { CudrService, CudrException } from './cudr.service';

@Module({
  imports: [
    BlobModule,
  ]
})
export class CudrModule {
  static factory(): DynamicModule {
    return {
      module: CudrModule,
      providers: [
        CudrService,
      ],
      exports: [
        CudrService,
      ],
      controllers: [
        MissionListController,
        ...loadDecoratedKlass(CudrEntity).map((klass) => {
          const name = loadDecoratorData(CudrEntity, klass).name;
          @Controller(`cudr/${name}`)
          class CudrController {
            @Inject(CudrService) service!: CudrService;
            @Post('findEntityList')
            async findEntityList(@Body() body: any) {
              try {
                return await this.service.findEntityList(klass, body);
              } catch (e) {
                if (e instanceof CudrException) {
                  throw new BadRequestException(e.message)
                } else {
                  throw e;
                }
              }
            }
            @Post('statistic')
            async statistic(@Body() body: any) {
              try {
                return await this.service.statistic(klass, body);
              } catch (e) {
                if (e instanceof CudrException) {
                  throw new BadRequestException(e.message)
                } else {
                  throw e;
                }
              }
            }
          }
          let controllerKlass = eval(`class ${name}${CudrController.name} extends ${CudrController.name}{};${name}${CudrController.name}`);
          return controllerKlass;
        }),
      ],
    }
  }
}