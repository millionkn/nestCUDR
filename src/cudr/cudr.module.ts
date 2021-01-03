import { Module, DynamicModule, Controller } from "@nestjs/common";
import { loadDecoratedKlass, loadDecoratorData } from "@/utils/decorator";
import { CudrEntity } from "./CudrBaseEntity";

@Module({
  imports: [
  ]
})
export class CudrModule {
  static factory(): DynamicModule {
    return {
      module: CudrModule,
      providers: [
      ],
      exports: [
      ],
      controllers: [
        ...loadDecoratedKlass(CudrEntity).map((klass) => {
          const name = loadDecoratorData(CudrEntity, klass).name;
          @Controller(`cudr/${name}`)
          class CudrController {
          }
          let controllerKlass = eval(`class ${name}${CudrController.name} extends ${CudrController.name}{};${name}${CudrController.name}`);
          return controllerKlass;
        }),
      ],
    }
  }
}