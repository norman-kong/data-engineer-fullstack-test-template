import { Body, Controller, Post } from '@nestjs/common';
import { PosthogEventDto } from './dto/posthog-event.dto';
import { MarketingService } from './marketing.service';
import { FailureEventsService } from './failure-events.service';

@Controller('posthog')
export class PosthogController {
  constructor(
    private readonly marketingService: MarketingService,
    private readonly failureEventsService: FailureEventsService
  ) {}

  @Post('webhook')
  async handleWebhook(@Body() payload: PosthogEventDto) {
    switch (payload.event) {
      case 'feature_used':
        await this.marketingService.handleFeatureUsed(payload);
        break;

      case 'generation_failed':
        await this.failureEventsService.handleGenerationFailed(payload);
        break;

      default:
        // Ignore other events like $pageview etc.
        break;
    }

    // Always respond quickly so PostHog doesn't retry
    return { status: 'ok' };
  }
}
