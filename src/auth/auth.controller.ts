import { Controller, Post, Session } from "@nestjs/common";
import { ID } from "src/utils/entity";
import { CurrentUserID } from "./decorators";

@Controller('api/auth')
export class AuthController {
  @Post('currentUser')
  async currentUser(@CurrentUserID() id: ID) {
    return { id };
  }
  @Post('logout')
  async logout(@Session() session: Express.Session) {
    session.destroy(() => { });
  }
}