import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Question } from './entities/question.entity';
import { Skill } from '@modules/skills/entities/skill.entity';
import { AnswerChoice } from '@modules/exams/entities/answer-choice.entity';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';

@Injectable()
export class QuestionsService {
  constructor(
    @InjectRepository(Question)
    private questionRepository: Repository<Question>,
    @InjectRepository(Skill)
    private skillRepository: Repository<Skill>,
    private dataSource: DataSource, // Sử dụng DataSource cho Transaction
  ) {}

  // 1. Lấy danh sách tất cả câu hỏi
  /**
   * [ADMIN] Lấy danh sách câu hỏi có phân trang (Pagination)
   * @param page Trang hiện tại (bắt đầu từ 1)
   * @param limit Số lượng câu hỏi trên mỗi trang
   */
  async findAll(page: number = 1, limit: number = 10) {
    // Tính toán số lượng bản ghi cần bỏ qua
    // Ví dụ: Trang 2, giới hạn 10 câu => skip = (2 - 1) * 10 = 10 (bỏ qua 10 câu đầu)
    const skip = (page - 1) * limit;

    const [questions, total] = await this.questionRepository.findAndCount({
      relations: {
        Skill: true,
        answerChoices: true,
      },
      order: {
        QuestionID: 'DESC', // Sắp xếp câu hỏi mới nhất lên đầu
      },
      skip: skip, // Bỏ qua số lượng bản ghi tương ứng
      take: limit, // Lấy đúng số lượng bản ghi quy định
    });

    // Trả về cấu trúc chuẩn kèm theo thông tin phân trang cho Frontend dễ xử lý
    return {
      success: true,
      questions,
      total,
      currentPage: Number(page),
      totalPages: Math.ceil(total / limit),
    };
  }

  // 2. Tạo câu hỏi mới (Transaction)
  async create(createDto: CreateQuestionDto) {
    const correctCount = createDto.choices.filter((c) => c.isCorrect).length;
    if (correctCount !== 1) {
      throw new BadRequestException('Phải có đúng 1 đáp án đúng');
    }

    const skill = await this.skillRepository.findOne({
      where: { SkillID: createDto.skillId },
    });
    if (!skill) throw new NotFoundException('Kỹ năng không tồn tại');

    // Bắt đầu Transaction
    return await this.dataSource.transaction(async (manager) => {
      // Lưu câu hỏi
      const question = manager.create(Question, {
        Content: createDto.content,
        SkillID: createDto.skillId,
        Difficulty: createDto.difficulty,
        KnowledgeType: createDto.knowledgeType,
      });
      const savedQuestion = await manager.save(Question, question);

      // Lưu các đáp án
      const choices = createDto.choices.map((choice) => {
        return manager.create(AnswerChoice, {
          Content: choice.content,
          IsCorrectAnswer: choice.isCorrect,
          Question: savedQuestion,
        });
      });
      await manager.save(AnswerChoice, choices);

      return savedQuestion;
    });
  }

  // 3. Lấy chi tiết một câu hỏi
  async findOne(id: number) {
    const question = await this.questionRepository.findOne({
      where: { QuestionID: id },
      relations: {
        Skill: true,
        answerChoices: true,
      },
    });
    if (!question) throw new NotFoundException('Câu hỏi không tồn tại');
    return question;
  }

  // 4. Cập nhật câu hỏi (Transaction)
  async update(id: number, updateDto: UpdateQuestionDto) {
    const question = await this.findOne(id);

    if (updateDto.choices) {
      const correctCount = updateDto.choices.filter((c) => c.isCorrect).length;
      if (correctCount !== 1) {
        throw new BadRequestException('Phải có đúng 1 đáp án đúng');
      }
    }

    return await this.dataSource.transaction(async (manager) => {
      // Cập nhật thông tin câu hỏi
      if (updateDto.content) question.Content = updateDto.content;
      if (updateDto.difficulty) question.Difficulty = updateDto.difficulty;
      if (updateDto.knowledgeType)
        question.KnowledgeType = updateDto.knowledgeType;
      await manager.save(Question, question);

      // Nếu có cập nhật đáp án, xóa đáp án cũ và tạo lại
      if (updateDto.choices) {
        await manager.delete(AnswerChoice, { QuestionID: id });

        const newChoices = updateDto.choices.map((choice) => {
          return manager.create(AnswerChoice, {
            Content: choice.content,
            IsCorrectAnswer: choice.isCorrect,
            Question: question,
          });
        });
        await manager.save(AnswerChoice, newChoices);
      }

      return await manager.findOne(Question, {
        where: { QuestionID: id },
        relations: {
          answerChoices: true,
        },
      });
    });
  }

  // 5. Xóa câu hỏi
  async remove(id: number) {
    const question = await this.findOne(id);
    await this.questionRepository.remove(question);
    return { message: 'Xóa câu hỏi thành công' };
  }

  // 6. Lấy câu hỏi theo Kỹ năng & lọc theo độ khó
  async findBySkill(skillId: number, difficulty?: string) {
    const query = this.questionRepository
      .createQueryBuilder('question')
      .leftJoinAndSelect('question.answerChoices', 'answerChoices')
      .where('question.SkillID = :skillId', { skillId });

    if (difficulty) {
      query.andWhere('question.Difficulty = :difficulty', { difficulty });
    }
    return await query.getMany();
  }

  // 7. Tìm kiếm câu hỏi
  async search(keyword: string, skillId?: number) {
    const query = this.questionRepository
      .createQueryBuilder('question')
      .leftJoinAndSelect('question.Skill', 'skill')
      .where('question.Content LIKE :keyword', { keyword: `%${keyword}%` });

    if (skillId) {
      query.andWhere('question.SkillID = :skillId', { skillId });
    }
    return await query.getMany();
  }

  // 8. Thống kê câu hỏi
  async getStatistics(skillId?: number) {
    const query = this.questionRepository.createQueryBuilder('question');
    if (skillId) {
      query.where('question.SkillID = :skillId', { skillId });
    }

    const questions = await query.getMany();

    const stats = {
      total_questions: questions.length,
      by_difficulty: {
        De: questions.filter((q) => q.Difficulty === 'De').length,
        TrungBinh: questions.filter((q) => q.Difficulty === 'TrungBinh').length,
        Kho: questions.filter((q) => q.Difficulty === 'Kho').length,
      },
      by_knowledge_type: {
        KhaiNiem: questions.filter((q) => q.KnowledgeType === 'KhaiNiem')
          .length,
        DinhLy: questions.filter((q) => q.KnowledgeType === 'DinhLy').length,
        TinhChat: questions.filter((q) => q.KnowledgeType === 'TinhChat')
          .length,
        DangBaiTap: questions.filter((q) => q.KnowledgeType === 'DangBaiTap')
          .length,
      },
    };

    return stats;
  }
}
