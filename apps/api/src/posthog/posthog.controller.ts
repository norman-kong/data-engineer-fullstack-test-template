import { Body, Controller, Post } from '@nestjs/common';
import { PosthogWebhookDto } from './dto/posthog-webhook.dto';
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
  async handleWebhook(@Body() body: PosthogWebhookDto) {

    const raw = body.event; 

    const payload: PosthogEventDto = {
      event: raw.event,
      distinct_id: raw.distinct_id,
      properties: raw.properties,
      timestamp: raw.timestamp,
    };

    switch (payload.event) {
      case 'feature_used':
        await this.marketingService.handleFeatureUsed(payload);
        break;

      case 'generation_failed':
        await this.failureEventsService.handleGenerationFailed(payload);
        break;

      default:
        console.warn(`Unexpected event type received: ${payload.event}`, {
            distinct_id: payload.distinct_id,
            properties: payload.properties,
            timestamp: payload.timestamp,
        });
        break;
    }

    // Always respond quickly so PostHog doesn't retry
    return { status: 'ok' };
  }
}
