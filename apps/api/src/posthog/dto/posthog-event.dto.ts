import { IsString, IsOptional, IsObject } from 'class-validator';

export class PosthogEventDto {
  @IsString()
  event!: string;  // "feature_used" / "generation_failed"

  @IsString()
  distinct_id!: string;

  @IsOptional()
  @IsObject()
  properties?: Record<string, any>;

  @IsOptional()
  @IsString()
  timestamp?: string;
}
