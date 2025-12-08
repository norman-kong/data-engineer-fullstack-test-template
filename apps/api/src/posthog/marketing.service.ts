import { Injectable, Logger } from '@nestjs/common';
import { PosthogEventDto } from './dto/posthog-event.dto';
import { EmailService } from '../email/email.service';

@Injectable()
export class MarketingService {

  constructor(private readonly emailService: EmailService) {}

  private readonly logger = new Logger(MarketingService.name);

  // key: `${distinctId}:${featureName}` -> count
  private readonly usageCounts = new Map<string, number>();

  // key: `${distinctId}:${featureName}` for which we've already "sent" the email
  private readonly emailedKeys = new Set<string>();

  private buildKey(distinctId: string, featureName: string): string {
    return `${distinctId}:${featureName}`;
  }

  async handleFeatureUsed(event: PosthogEventDto): Promise<void> {
    const props = event.properties ?? {};
    const featureName = props.feature_name;

    if (!featureName) {
      this.logger.warn(
        `feature_used event missing 'feature_name' (distinct_id=${event.distinct_id})`,
      );
      return;
    }

    const key = this.buildKey(event.distinct_id, featureName);
    const previousCount = this.usageCounts.get(key) ?? 0;
    const newCount = previousCount + 1;
    this.usageCounts.set(key, newCount);

    this.logger.debug(
      `Feature used: distinct_id=${event.distinct_id}, feature=${featureName}, count=${newCount}`,
    );

    const THRESHOLD = 5;

    // Only "send" once per user+feature after hitting the threshold
    if (newCount >= THRESHOLD && !this.emailedKeys.has(key)) {
      this.emailedKeys.add(key);

      // Mock sending email 
      await this.emailService.sendMarketingEmail(event.distinct_id, featureName, newCount);
    }
  }
}
