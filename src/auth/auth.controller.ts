import { Controller, Post, Session } from "@nestjs/common";
import { Session as SessionType } from 'express-session';

@Controller('api/auth')
export class AuthController {
  @Post('logout')
  async logout(@Session() session: SessionType) {
    session.destroy(() => { });
  }
}