import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
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
    try {
      const subject = this.subjectRepo.create({
        SubjectID: subjectId,
        SubjectName: subjectName,
        Description: description,
      });
      return await this.subjectRepo.save(subject);
    } catch (error: unknown) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error as any).code
      ) {
        const code = (error as any).code;

        if (code === '23505' || code === 'ER_DUP_ENTRY') {
          throw new ConflictException('Tên môn học đã tồn tại');
        }
      }

      throw error;
    }
  }

  async getAllSubjects() {
    return await this.subjectRepo.find({ order: { SubjectName: 'ASC' } });
  }

  async getSubjectSummary() {
    const query = this.subjectRepo
      .createQueryBuilder('subject')
      .leftJoin('subject.chapters', 'chapter')
      .leftJoin('chapter.lessons', 'lesson')
      .select([
        'subject.SubjectID AS id',
        'subject.SubjectName AS name',
        'subject.Description AS description',
      ])
      .addSelect('COUNT(DISTINCT chapter.ChapterID)', 'chapterCount')
      .addSelect('COUNT(DISTINCT lesson.LessonID)', 'lessonCount')
      .groupBy('subject.SubjectID, subject.SubjectName, subject.Description');

    return await query.getRawMany();
  }

  async getSubjectById(id: string) {
    return await this.subjectRepo.findOne({ where: { SubjectID: id } });
  }

  async updateSubject(id: string, subjectName?: string, description?: string) {
    // Tối ưu: Dùng update() trực tiếp thay vì findOne() + save()
    const updateData: Partial<Subject> = {};
    if (subjectName !== undefined) updateData.SubjectName = subjectName;
    if (description !== undefined) updateData.Description = description;

    const result = await this.subjectRepo.update({ SubjectID: id }, updateData);

    if (result.affected === 0) {
      throw new NotFoundException('Môn học không tồn tại');
    }

    // Trả về dữ liệu mới nhất
    return this.getSubjectById(id);
  }

  async deleteSubject(id: string) {
    // Tối ưu: Dùng delete() trực tiếp
    const result = await this.subjectRepo.delete({ SubjectID: id });
    if (result.affected === 0) {
      throw new NotFoundException('Môn học không tồn tại');
    }
  }

  async getContentHierarchy(subjectId: string) {
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

    return {
      subject: {
        id: subject.SubjectID,
        name: subject.SubjectName,
        description: subject.Description,
      },
      chapters:
        subject.chapters?.map((chapter) => ({
          id: chapter.ChapterID,
          name: chapter.ChapterName, // Giả định Entity Chapter có cột ChapterName
          lessons:
            chapter.lessons?.map((lesson) => ({
              id: lesson.LessonID,
              name: lesson.LessonName, // Giả định Entity Lesson có cột LessonName
              skills:
                lesson.skills?.map((skill) => ({
                  id: skill.SkillID,
                  name: skill.SkillName, // Giả định Entity Skill có cột SkillName
                })) || [],
            })) || [],
        })) || [],
    };
  }
}
