import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Lesson } from './entities/lesson.entity';
import { Chapter } from '@modules/chapters/entities/chapter.entity';

@Injectable()
export class LessonsService {
  constructor(
    @InjectRepository(Lesson) private lessonRepo: Repository<Lesson>,
    @InjectRepository(Chapter) private chapterRepo: Repository<Chapter>,
  ) {}

  // 1. Tạo bài học mới
  async createLesson(lessonId: string, lessonName: string, chapterId: string) {
    // Tìm kiếm chương học dựa trên ChapterID
    const chapter = await this.chapterRepo.findOne({
      where: { ChapterID: chapterId },
    });

    if (!chapter) {
      throw new NotFoundException('Chương học không tồn tại');
    }

    // Khởi tạo đối tượng Lesson với các thuộc tính đúng chuẩn Entity
    const lesson = this.lessonRepo.create({
      LessonID: lessonId,
      LessonName: lessonName,
      Chapter: chapter,
    });

    return await this.lessonRepo.save(lesson);
  }

  // 2. Lấy danh sách bài học theo mảng các ChapterID
  async getLessonsByChapters(chapterIds: string[]) {
    return await this.lessonRepo.find({
      where: { Chapter: { ChapterID: In(chapterIds) } },
      // Sử dụng cú pháp object cho TypeORM >= 0.3.x
      relations: { Chapter: true },
      order: { LessonID: 'ASC' },
    });
  }

  // 3. Lấy tất cả bài học kèm theo số lượng kỹ năng (skill)
  async getAllLessonsWithSkillCount() {
    const query = this.lessonRepo
      .createQueryBuilder('lesson')
      .leftJoinAndSelect('lesson.Chapter', 'chapter')
      // Giả định relation trong Lesson entity kết nối với Skill tên là 'skills'
      .leftJoin('lesson.skills', 'skill')
      .select([
        'lesson.LessonID AS id',
        'lesson.LessonName AS name',
        'chapter.ChapterID AS chapterId',
        'chapter.ChapterName AS chapterName',
      ])
      // Đếm số lượng kỹ năng. Giả định bảng Skill dùng khóa chính là SkillID
      .addSelect('COUNT(skill.SkillID)', 'skillCount')
      // Cần Group By tất cả các trường không nằm trong hàm tính toán (COUNT)
      .groupBy(
        'lesson.LessonID, chapter.ChapterID, lesson.LessonName, chapter.ChapterName',
      )
      .orderBy('lesson.LessonID', 'ASC');

    const result = await query.getRawMany();

    // Xử lý map dữ liệu thô an toàn
    return result.map((item) => ({
      id: item.id,
      name: item.name,
      chapterId: item.chapterid || item.chapterId,
      chapterName: item.chaptername || item.chapterName,
      skillCount: parseInt(item.skillcount || item.skillCount || '0', 10),
    }));
  }

  // 4. Lấy chi tiết một bài học theo ID
  async getLessonById(id: string) {
    return await this.lessonRepo.findOne({
      where: { LessonID: id },
      relations: { Chapter: true },
    });
  }

  // 5. Cập nhật tên bài học
  async updateLesson(id: string, name: string) {
    const lesson = await this.getLessonById(id);

    if (!lesson) {
      throw new NotFoundException('Bài học không tồn tại');
    }

    // Gán giá trị mới cho thuộc tính LessonName
    lesson.LessonName = name;
    return await this.lessonRepo.save(lesson);
  }

  // 6. Xóa bài học
  async deleteLesson(id: string) {
    const lesson = await this.getLessonById(id);

    if (!lesson) {
      throw new NotFoundException('Bài học không tồn tại');
    }

    await this.lessonRepo.remove(lesson);
  }
}
