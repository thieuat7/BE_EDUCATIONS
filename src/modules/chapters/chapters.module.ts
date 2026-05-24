import { Module } from '@nestjs/common';
import { ChaptersService } from './chapters.service';
import { ChaptersController } from './chapters.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Chapter } from './entities/chapter.entity';
import { Subject } from '@modules/subjects/entities/subject.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Chapter, Subject])],
  controllers: [ChaptersController],
  providers: [ChaptersService],
})
export class ChaptersModule {}
