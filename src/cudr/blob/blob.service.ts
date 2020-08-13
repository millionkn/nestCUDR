import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BlobEntity } from './blob.entity';
import { Repository } from 'typeorm';

@Injectable()
export class BlobService {
  @InjectRepository(BlobEntity)
  repository!: Repository<BlobEntity>;
  async create(buffers: Buffer[]): Promise<string[]> {
    let result = await this.repository.insert(buffers.map((blob) => ({ blob })));
    return result.identifiers.map(r => r.id)
  }
  async find(id: string) {
    try {
      let result = await this.repository.findOneOrFail(id, {
        select: ['blob']
      });
      return result.blob;
    } catch (e) {
      return null;
    }

  }
}
