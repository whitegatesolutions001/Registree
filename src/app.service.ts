import { Injectable, Logger } from '@nestjs/common';
import { uploadFileToS3 } from '@utils/functions/utils.function';
import { RequestStatus } from '@utils/types/utils.constant';

export class FileResponseDTO<T> {
  status: RequestStatus;
  data: T;
}

@Injectable()
export class AppService {
  private logger: Logger = new Logger(AppService.name);

  async uploadSingleFile(filePath: string): Promise<FileResponseDTO<string>> {
    try {
      const uploadedFilePath = await uploadFileToS3(filePath, true);
      return {
        status: RequestStatus.SUCCESSFUL,
        data: uploadedFilePath,
      };
    } catch (ex) {
      this.logger.error(ex);
      throw ex;
    }
  }

  async uploadMultipleFiles(
    filePaths: string[],
  ): Promise<FileResponseDTO<string[]>> {
    try {
      const filePathAsync = filePaths.map((filePath) =>
        uploadFileToS3(filePath, true),
      );
      const [...uploadedFilePaths] = await Promise.all(filePathAsync);
      return {
        status: RequestStatus.SUCCESSFUL,
        data: uploadedFilePaths,
      };
    } catch (ex) {
      this.logger.error(ex);
      throw ex;
    }
  }
}
