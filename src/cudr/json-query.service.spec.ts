import { Test, TestingModule } from '@nestjs/testing';
import { JsonQueryService } from './json-query.service';

describe('JsonWhereQueryService', () => {
  let service: JsonQueryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [JsonQueryService],
    }).compile();

    service = module.get<JsonQueryService>(JsonQueryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
