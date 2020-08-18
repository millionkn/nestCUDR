import { Test, TestingModule } from '@nestjs/testing';
import { BusinessGateway } from './business.gateway';

describe('BusinessGateway', () => {
  let gateway: BusinessGateway;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BusinessGateway],
    }).compile();

    gateway = module.get<BusinessGateway>(BusinessGateway);
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });
});
