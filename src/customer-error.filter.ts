import { ArgumentsHost, Catch, ExceptionFilter } from "@nestjs/common";
import { Response } from "express";
import { CustomerError } from "./customer-error";
import { Socket } from "socket.io";

@Catch(CustomerError)
export class CustomerErrorFilter implements ExceptionFilter {
  catch(exception: CustomerError, host: ArgumentsHost) {
    const type = host.getType();
    if (type === 'http') {
      const http = host.switchToHttp();
      const response = http.getResponse<Response>();
      response.status(400).json(exception.messageBody).end();
    } else if (type === 'ws') {
      const ws = host.switchToWs().getClient<Socket>();
      ws.emit('customerError', exception.messageBody);
    }
  }
}
