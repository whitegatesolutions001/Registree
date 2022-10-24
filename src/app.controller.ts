import {
  Controller,
  Get,
  Post,
  Res,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiOperation, ApiProduces } from '@nestjs/swagger';
import { MulterValidators } from '@utils/validators/multer.validator';
import { Response } from 'express';
import { diskStorage } from 'multer';
import { AppService, FileResponseDTO } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appSrv: AppService) {}

  @Get()
  getHello(): { message: string } {
    return { message: 'Hello world' };
  }

  @Get('/health-check')
  healthCheck(@Res() res: Response): void {
    const healthcheck = {
      uptime: process.uptime(),
      message: 'OK',
      timestamp: Date.now(),
    };
    try {
      res.send(healthcheck);
    } catch (ex) {
      healthcheck.message = ex;
      res.status(503).send();
    }
  }

  @ApiOperation({
    description: `
      Upload multiple files under the key: 'files[]'. 
      Maximum of 25 files are allowed.
    `,
  })
  @ApiProduces('json')
  @UseInterceptors(
    FilesInterceptor('files[]', 25, {
      storage: diskStorage({
        destination: './uploads',
        filename: MulterValidators.preserveOriginalFileName,
      }),
      fileFilter: MulterValidators.imageFileFilter,
    }),
  )
  @Post('/upload-files')
  async uploadMultipleFiles(
    @UploadedFiles() files: Array<Express.Multer.File>,
  ): Promise<FileResponseDTO<string[]>> {
    const filePaths: string[] = files.map((data) => `uploads/${data.filename}`);
    return await this.appSrv.uploadMultipleFiles(filePaths);
  }
}
