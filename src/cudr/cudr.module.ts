import { Module, DynamicModule, Controller, Post, Body, Inject, BadRequestException } from "@nestjs/common";
import { BlobModule } from "./blob/blob.module";
import { MissionListController } from "./MissionList.controller";
import { loadDecoratedKlass, loadDecoratorData } from "@/utils/decorator";
import { CudrEntity } from "./decorators";
import { CudrService } from "./cudr.service";
import { getManager } from "typeorm";

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
              return await this.service.findEntityList(getManager(), klass, body);
            }
            @Post('statistic')
            async statistic(@Body() body: any) {
              return await this.service.statistic(getManager(), klass, body);
            }
          }
          let controllerKlass = eval(`class ${name}${CudrController.name} extends ${CudrController.name}{};${name}${CudrController.name}`);
          return controllerKlass;
        }),
      ],
    }
  }
}