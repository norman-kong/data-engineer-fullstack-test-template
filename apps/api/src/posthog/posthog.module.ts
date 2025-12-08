import { Module } from '@nestjs/common';
import { PosthogController } from './posthog.controller';
import { MarketingService } from './marketing.service';
import { FailureEventsService } from './failure-events.service';

@Module({
  controllers: [PosthogController],
  providers: [MarketingService, FailureEventsService],
})
export class PosthogModule {}
