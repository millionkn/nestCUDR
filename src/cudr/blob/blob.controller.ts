import { Controller, Post, UseInterceptors, UploadedFiles, Inject, forwardRef, Get, Param, Res, NotFoundException } from "@nestjs/common";
import { AnyFilesInterceptor } from "@nestjs/platform-express";
import { BlobService } from "./blob.service";
import { Response } from "express";
@Controller('cudr/blob')
export class BlobController {
  @Inject(forwardRef(() => BlobService))
  service!: BlobService;

  @Post('upload')
  @UseInterceptors(AnyFilesInterceptor())
  async uploadFile(@UploadedFiles() files: { buffer: Buffer, fieldname: string }[]) {
    let results = await this.service.create(files.map((file) => file.buffer));
    let ret: { [key: string]: string } = {};
    files.forEach((file, index) => { ret[file.fieldname] = results[index] });
    return ret;
  }

  @Get(':id')
  async findFile(@Param('id') id: string, @Res() res: Response) {
    let result = await this.service.find(id);
    if (result === null) {
      throw new NotFoundException();
    }
    res.end(result);
  }
}
