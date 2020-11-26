import './utils/index';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as session from 'express-session';
import * as bodyParser from 'body-parser';
import { getConnection } from 'typeorm';
import * as cors from 'cors';
import * as express from 'express';
import { NotFoundFilter } from './not-found.filter';
import { CustomerErrorFilter } from './customer-error.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // 保持连接，虽然可以通过其他方式指定，但有乱七八糟的东西需要考虑，比如服务器防火墙
  // 这个方法我想是最直接的了
  ((connect) => {
    setInterval(() => connect.query('select 1'), 15 * 1000);
  })(getConnection());
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: false }));
  app.use(session({
    secret: 'session-secret'
  }))
  app.use(cors())
  app.use(express.static('static'))
  app.useGlobalFilters(new NotFoundFilter(),new CustomerErrorFilter());
  await app.listen(3000);
}
bootstrap();
