import { IsObject } from 'class-validator';

export class PosthogWebhookDto {
  @IsObject()
  event!: {
    uuid: string;
    event: string;          // "feature_used", "generation_failed", etc.
    distinct_id: string;
    properties?: Record<string, any>;
    timestamp?: string;
    url?: string;
  };

  @IsObject()
  person?: {
    id: string;
    properties?: Record<string, any>;
  };
}
