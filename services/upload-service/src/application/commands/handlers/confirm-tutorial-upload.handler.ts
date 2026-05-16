import { BadRequestException, Inject, NotFoundException } from '@nestjs/common';
import { CommandBus, CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import type { FileMetadataRepository } from '../../../domain/repositories/file-metadata.repository.interface';
import { FILE_METADATA_REPOSITORY } from '../../../domain/repositories/tokens';
import { ConfirmTutorialUploadCommand } from '../confirm-tutorial-upload.command';
import { ProcessVideoCommand } from '../process-video.command';

@CommandHandler(ConfirmTutorialUploadCommand)
export class ConfirmTutorialUploadHandler implements ICommandHandler<ConfirmTutorialUploadCommand> {
  constructor(
    @Inject(FILE_METADATA_REPOSITORY)
    private readonly fileRepository: FileMetadataRepository,
    private readonly commandBus: CommandBus,
  ) {}

  async execute(command: ConfirmTutorialUploadCommand) {
    const fileMeta = await this.fileRepository.findById(command.fileId);
    if (!fileMeta) {
      throw new NotFoundException(
        'File metadata not found. Did you request a Presigned URL first?',
      );
    }

    if (fileMeta.s3Key !== command.s3Key) {
      throw new BadRequestException('s3Key does not match file metadata.');
    }

    return this.commandBus.execute(
      new ProcessVideoCommand(
        command.fileId,
        command.s3Key,
        fileMeta.mimeType!,
        command.uploadedBy,
      ),
    );
  }
}
