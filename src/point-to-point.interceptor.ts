import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, concat, of } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class PointToPointInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    if (context.getType() === 'ws') {
      const eventInterface = `eventInterface/${Math.random()}`;
      return concat(
        of({ eventInterface }),
        next.handle().pipe(map((data) => ({ event: eventInterface, data }))),
      );
    } else {
      return next.handle();
    }
  }
}
