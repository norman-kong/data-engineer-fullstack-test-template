import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  async sendMarketingEmail(
    distinctId: string,
    featureName: string,
    count: number,
  ): Promise<void> {
    // In a real system, this would send an actual email.
    this.logger.log(
      `MockEmailService: Sent marketing email to distinct_id=${distinctId} for feature='${featureName}' (count=${count}).`,
    );
  }
}
