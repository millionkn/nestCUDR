import { ArgumentsHost, Catch, ExceptionFilter, NotFoundException } from "@nestjs/common";
import { Response, Request } from "express";
import { join } from "path";

const indexPath = join(__dirname, '../static/index.html');

@Catch(NotFoundException)
export class NotFoundFilter implements ExceptionFilter {
  catch(exception: NotFoundException, host: ArgumentsHost) {
    const http = host.switchToHttp();
    const response = http.getResponse<Response>();
    const request = http.getRequest<Request>();
    if (request.method === 'GET') {
      response.sendFile(indexPath)
    }else{
      response.status(404).send();
    }
  }
}
