import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PosthogModule } from '../posthog/posthog.module';

@Module({
  imports: [PosthogModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
