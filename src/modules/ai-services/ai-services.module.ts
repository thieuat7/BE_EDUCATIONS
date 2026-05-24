// ai/ai.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AnalyticsEngineService } from './analytics-engine.service';
import { KnowledgeAnalyzerService } from './knowledge-analyzer.service';

@Module({
  imports: [ConfigModule],
  providers: [AnalyticsEngineService, KnowledgeAnalyzerService],
  exports: [AnalyticsEngineService, KnowledgeAnalyzerService],
})
export class AiModule {}
