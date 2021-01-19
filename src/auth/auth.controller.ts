import { Controller, Post, Session } from "@nestjs/common";
import { ID } from "@/utils/entity";
import { CurrentUserID, NeedLogin } from "./decorators";
import { Session as SessionType } from 'express-session';

@Controller('api/auth')
export class AuthController {
  @NeedLogin(() => true)
  @Post('currentUser')
  async currentUser(@CurrentUserID() id: ID) {
    return { id };
  }
  @Post('logout')
  async logout(@Session() session: SessionType) {
    session.destroy(() => { });
  }
}