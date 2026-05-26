import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
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

  // Tạo chương mới
  async createChapter(
    chapterId: string,
    chapterName: string,
    subjectId: string,
  ) {
    // 💡 1. KIỂM TRA TRÙNG LẶP ID:
    // YÊU CẦU: Thuộc tính 'ChapterID' phải viết y hệt như bạn khai báo trong chapter.entity.ts
    const existingChapter = await this.chapterRepo.findOne({
      where: { ChapterID: chapterId },
    });

    if (existingChapter) {
      throw new ConflictException(
        `Mã chương '${chapterId}' đã tồn tại trong hệ thống!`,
      );
    }

    // 2. KIỂM TRA MÔN HỌC
    const subject = await this.subjectRepo.findOne({
      where: { SubjectID: subjectId }, // Tương tự, kiểm tra lại tên thuộc tính này
    });

    if (!subject) {
      throw new NotFoundException('Môn học không tồn tại');
    }

    // 3. TẠO VÀ LƯU
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
