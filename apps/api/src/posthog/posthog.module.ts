import { Module } from '@nestjs/common';
import { PosthogController } from './posthog.controller';
import { MarketingService } from './marketing.service';
import { FailureEventsService } from './failure-events.service';
import { EmailService } from '../email/email.service';

@Module({
  controllers: [PosthogController],
  providers: [MarketingService, FailureEventsService, EmailService],
})
export class PosthogModule {}
