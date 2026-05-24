import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subject } from './entities/subject.entity';

@Injectable()
export class SubjectsService {
  constructor(
    @InjectRepository(Subject)
    private subjectRepo: Repository<Subject>,
  ) {}

  async createSubject(
    subjectId: string,
    subjectName: string,
    description?: string,
  ) {
    // Sử dụng đúng tên thuộc tính: SubjectID, SubjectName, Description
    const subject = this.subjectRepo.create({
      SubjectID: subjectId,
      SubjectName: subjectName,
      Description: description,
    });
    return await this.subjectRepo.save(subject);
  }

  async getAllSubjects() {
    // Sắp xếp theo cột SubjectName
    return await this.subjectRepo.find({ order: { SubjectName: 'ASC' } });
  }

  async getSubjectSummary() {
    // Dùng QueryBuilder để thay thế cho hàm count của Django
    const query = this.subjectRepo
      .createQueryBuilder('subject')
      .leftJoin('subject.chapters', 'chapter')
      .leftJoin('chapter.lessons', 'lesson')
      .select([
        'subject.SubjectID AS id',
        'subject.SubjectName AS name',
        'subject.Description AS description',
      ])
      // Sử dụng đúng khóa chính của từng bảng liên kết
      .addSelect('COUNT(DISTINCT chapter.ChapterID)', 'chapterCount')
      .addSelect('COUNT(DISTINCT lesson.LessonID)', 'lessonCount')
      // Group By tất cả các trường được Select mà không nằm trong hàm tập hợp
      .groupBy('subject.SubjectID, subject.SubjectName, subject.Description');

    return await query.getRawMany();
  }

  async getSubjectById(id: string) {
    return await this.subjectRepo.findOne({ where: { SubjectID: id } });
  }

  async updateSubject(id: string, subjectName?: string, description?: string) {
    const subject = await this.getSubjectById(id);
    if (!subject) throw new NotFoundException('Môn học không tồn tại');

    // Cập nhật giá trị vào đúng các thuộc tính viết hoa
    if (subjectName !== undefined) subject.SubjectName = subjectName;
    if (description !== undefined) subject.Description = description;

    return await this.subjectRepo.save(subject);
  }

  async deleteSubject(id: string) {
    const subject = await this.getSubjectById(id);
    if (!subject) throw new NotFoundException('Môn học không tồn tại');
    await this.subjectRepo.remove(subject);
  }

  async getContentHierarchy(subjectId: string) {
    // Thay thế prefetch_related của Django bằng relations Object của TypeORM mới
    const subject = await this.subjectRepo.findOne({
      where: { SubjectID: subjectId },
      relations: {
        chapters: {
          lessons: {
            skills: true,
          },
        },
      },
      order: {
        chapters: {
          ChapterID: 'ASC',
          lessons: {
            LessonID: 'ASC',
            skills: {
              SkillID: 'ASC',
            },
          },
        },
      },
    });

    if (!subject) return null;

    // Chuẩn hóa toàn bộ cấu trúc trả về sang tiếng Anh với Dấu ?. để đảm bảo an toàn
    return {
      subject: {
        id: subject.SubjectID,
        name: subject.SubjectName,
        description: subject.Description,
      },
      chapters:
        subject.chapters?.map((chapter) => ({
          id: chapter.ChapterID,
          name: chapter.ChapterName,
          lessons: chapter.lessons?.map((lesson) => ({
            id: lesson.LessonID,
            name: lesson.LessonName,
            skills: lesson.skills?.map((skill) => ({
              id: skill.SkillID,
              name: skill.SkillName,
            })),
          })),
        })) || [],
    };
  }
}
