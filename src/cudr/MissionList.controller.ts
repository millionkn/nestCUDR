import { Controller } from "@nestjs/common";

type UpdateMission = {
  entityName: string,
  object: any;
}
type DeleteMission = {
  entityName: string,
  object: any;
}
@Controller('cudr/transaction')
export class MissionListController {
}