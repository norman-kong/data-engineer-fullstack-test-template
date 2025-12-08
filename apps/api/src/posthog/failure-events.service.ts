import { Injectable, Logger } from '@nestjs/common';
import { PosthogEventDto } from './dto/posthog-event.dto';
import { promises as fs } from 'fs';
import * as path from 'path';

const TRAINING_FILE = path.join(process.cwd(), 'training_data.jsonl');

export interface FailureEvent {
  distinctId: string;
  failureReason: string;
  inputPrompt: string;
  timestamp: string;
}

@Injectable()
export class FailureEventsService {
  private readonly logger = new Logger(FailureEventsService.name);

  async handleGenerationFailed(event: PosthogEventDto): Promise<void> {
    const props = event.properties ?? {};

    const failureReasonRaw = props.failure_reason ?? 'unknown';
    const inputPromptRaw = props.input_prompt ?? '';

    // Simple sanitization / normalization
    const failureReason = String(failureReasonRaw).trim().slice(0, 100);
    const inputPrompt = String(inputPromptRaw).trim().slice(0, 1000);
    const timestamp = event.timestamp ?? new Date().toISOString();

    const sanitized: FailureEvent = {
      distinctId: event.distinct_id,
      failureReason,
      inputPrompt,
      timestamp,
    };

    // Save to file
    const line = JSON.stringify(sanitized) + '\n';

    try {
      await fs.appendFile(TRAINING_FILE, line, 'utf8');
      this.logger.log(
        `Appended failure event to ${TRAINING_FILE} for distinct_id=${sanitized.distinctId}`,
      );
      } catch (err) {
      this.logger.error(
        `Failed to append training data for distinct_id=${sanitized.distinctId}`,
        err,
      );
    }

    this.logger.log(
      `Stored generation_failed event for distinct_id=${sanitized.distinctId}, reason=${sanitized.failureReason}`,
    );
  }
}
