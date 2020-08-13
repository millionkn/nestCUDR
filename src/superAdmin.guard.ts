import { Injectable, CanActivate, Inject, forwardRef, ExecutionContext } from "@nestjs/common";
import { AuthService } from "./auth/auth.service";

@Injectable()
export class SuperAdminGuard implements CanActivate {
  @Inject(forwardRef(() => AuthService))
  private authService!: AuthService;

  async canActivate(context: ExecutionContext): Promise<boolean> {
    let session = context.switchToHttp().getRequest<Express.Request>().session;
    if (!session) { return false }
    return await this.authService.hasRole(session, 'superAdmin')
  }
}