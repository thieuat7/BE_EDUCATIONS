import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Chapter } from './entities/chapter.entity';
import { Subject } from '@modules/subjects/entities/subject.entity';

@Injectable()
export class ChaptersService {
  constructor(
    @InjectRepository(Chapter) private chapterRepo: Repository<Chapter>,
    @InjectRepository(Subject) private subjectRepo: Repository<Subject>,
  ) {}

  async createChapter(
    chapterId: string,
    chapterName: string,
    subjectId: string,
  ) {
    const subject = await this.subjectRepo.findOne({
      where: { SubjectID: subjectId },
    });

    if (!subject) {
      throw new NotFoundException('Môn học không tồn tại');
    }

    const chapter = this.chapterRepo.create({
      ChapterID: chapterId,
      ChapterName: chapterName,
      Subject: subject,
    });

    return await this.chapterRepo.save(chapter);
  }

  async getChaptersBySubject(subjectId: string) {
    return await this.chapterRepo.find({
      where: { Subject: { SubjectID: subjectId } },
      // 💡 Đã sửa: Sử dụng object { Subject: true } thay vì mảng ['Subject']
      relations: { Subject: true },
      order: { ChapterID: 'ASC' },
    });
  }

  async getAllChaptersWithLessonCount() {
    const query = this.chapterRepo
      .createQueryBuilder('chapter')
      .leftJoinAndSelect('chapter.Subject', 'subject')
      .leftJoin('chapter.lessons', 'lesson')
      .select([
        'chapter.ChapterID AS id',
        'chapter.ChapterName AS name',
        'subject.SubjectID AS subjectId',
        'subject.SubjectName AS subjectName',
      ])
      .addSelect('COUNT(lesson.LessonID)', 'lessonCount')
      .groupBy(
        'chapter.ChapterID, subject.SubjectID, chapter.ChapterName, subject.SubjectName',
      )
      .orderBy('chapter.ChapterID', 'ASC');

    const result = await query.getRawMany();

    return result.map((item) => ({
      id: item.id,
      name: item.name,
      subjectId: item.subjectid || item.subjectId,
      subjectName: item.subjectname || item.subjectName,
      lessonCount: parseInt(item.lessoncount || item.lessonCount || '0', 10),
    }));
  }

  async getChapterById(id: string) {
    return await this.chapterRepo.findOne({
      where: { ChapterID: id },
      // 💡 Đã sửa: Sử dụng object { Subject: true } thay vì mảng ['Subject']
      relations: { Subject: true },
    });
  }

  async updateChapter(id: string, name: string) {
    const chapter = await this.getChapterById(id);

    if (!chapter) {
      throw new NotFoundException('Chương không tồn tại');
    }

    chapter.ChapterName = name;
    return await this.chapterRepo.save(chapter);
  }

  async deleteChapter(id: string) {
    const chapter = await this.getChapterById(id);

    if (!chapter) {
      throw new NotFoundException('Chương không tồn tại');
    }

    await this.chapterRepo.remove(chapter);
  }
}
