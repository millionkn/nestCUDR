import { Injectable, CanActivate, ExecutionContext, Inject, forwardRef } from "@nestjs/common";
import { AuthService } from "./auth.service";

@Injectable()
export class LoginedGuard implements CanActivate {
  @Inject(forwardRef(() => AuthService))
  private authService!: AuthService;

  async canActivate(context: ExecutionContext): Promise<boolean> {
    let session = context.switchToHttp().getRequest<Express.Request>().session;
    if (session) {
      const account = await this.authService.accountSession(session)
      return account !== null;
    }
    return false;
  }
}
