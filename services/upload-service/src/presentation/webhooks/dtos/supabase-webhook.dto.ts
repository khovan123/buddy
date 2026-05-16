import { IsNotEmpty, IsObject, IsString } from 'class-validator';

/** Data Transfer Object for  supabase webhook. */
export class SupabaseWebhookDto {
  @IsString()
  type!: 'INSERT' | 'UPDATE' | 'DELETE';

  @IsString()
  table!: string;

  @IsObject()
  @IsNotEmpty()
  record!: {
    id: string;
    bucket_id: string;
    name: string;
    metadata?: {
      size?: number;
      mimetype?: string;
      correlationId?: string;
      correlation_id?: string;
      ['x-correlation-id']?: string;
      [key: string]: unknown;
    };
  };
}
