import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

/** Service handling business logic for  cloudinary. */
@Injectable()
export class CloudinaryService {
  constructor(private readonly config: ConfigService) {
    cloudinary.config({
      cloud_name: this.config.get<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: this.config.get<string>('CLOUDINARY_API_KEY'),
      api_secret: this.config.get<string>('CLOUDINARY_API_SECRET'),
      secure: true,
    });
  }

  /**
   * Executes the upload trailer operation.
   *
   * @param trailerStream - The trailerStream parameter
   * @param publicId - The publicId parameter
   * @returns Result of type Promise<string>
   */
  async uploadTrailer(trailerStream: Readable, publicId: string): Promise<string> {
    return new Promise<string>(async (resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: `${this.config.get<string>('CLOUDINARY_ASSET_FOLDER', 'buddy')}/${this.config.get<string>('CLOUDINARY_TRAILER_FOLDER', 'trailers')}`,
          public_id: publicId,
          overwrite: true,
          resource_type: 'video',
          upload_preset: this.config.get<string>('CLOUDINARY_UPLOAD_PRESET', 'buddy'),
        },
        (error, result) => {
          if (error) {
            reject(error);
            return;
          }

          if (!result?.secure_url) {
            reject(new Error('Cloudinary upload did not return secure_url'));
            return;
          }

          resolve(result.secure_url);
        },
      );

      try {
        await pipeline(trailerStream, uploadStream);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Upload a thumbnail image (Buffer) to Cloudinary.
   *
   * @param imageBuffer - Raw image buffer
   * @param publicId - Unique public ID for the image
   * @param folder - Cloudinary folder (default: 'thumbnails')
   * @returns Cloudinary secure_url
   */
  async uploadThumbnail(imageBuffer: Buffer, folder: string, publicId: string): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: `${this.config.get<string>('CLOUDINARY_ASSET_FOLDER', 'buddy')}/${this.config.get<string>('CLOUDINARY_THUMBNAIL_FOLDER', 'thumbnails')}/${folder}`,
          public_id: publicId,
          overwrite: true,
          resource_type: 'image',
          transformation: [{ width: 800, height: 600, crop: 'limit', quality: 'auto' }],
          upload_preset: this.config.get<string>('CLOUDINARY_UPLOAD_PRESET', 'buddy'),
        },
        (error, result) => {
          if (error) {
            reject(error);
            return;
          }
          if (!result?.secure_url) {
            reject(new Error('Cloudinary thumbnail upload did not return secure_url'));
            return;
          }
          resolve(result.secure_url);
        },
      );

      uploadStream.end(imageBuffer);
    });
  }
}
