import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { CreateExamDto } from './dto/create-exam.dto';
import { UpdateExamDto } from './dto/update-exam.dto';
import { Exam } from './entities/exam.entity';
import { Subject } from '@modules/subjects/entities/subject.entity';
import { Question } from '@modules/questions/entities/question.entity';
import { ExamDetail } from './entities/exam-detail.entity';
import { AnswerChoice } from '@modules/exams/entities/answer-choice.entity';
import { Result } from '@modules/results/entities/result.entity';
import { ResultDetail } from '@modules/results/entities/result-detail.entity';
import { User } from '@modules/users/entities/user.entity';

type ExamInput = Partial<{
  ExamName: string;
  TimeLimit: number;
  ExamStructure: Record<string, any>;
  SubjectID: string;
  examName: string;
  timeLimit: number;
  examStructure: Record<string, any>;
  subjectID: string;
}>;

type ExamRule = {
  type: 'chapter' | 'lesson' | 'skill';
  id: number;
  count: number;
  filters?: {
    difficulty?: any;
    knowledgeType?: any;
  };
};

function normalizeExamInput(input: ExamInput): Partial<Exam> {
  const normalizedInput: Partial<Exam> = {};
  const examName = input.ExamName ?? input.examName;
  const timeLimit = input.TimeLimit ?? input.timeLimit;
  const examStructure = input.ExamStructure ?? input.examStructure;
  const subjectID = input.SubjectID ?? input.subjectID;

  if (examName !== undefined) normalizedInput.ExamName = examName;
  if (timeLimit !== undefined) normalizedInput.TimeLimit = timeLimit;
  if (examStructure !== undefined)
    normalizedInput.ExamStructure = examStructure;
  if (subjectID !== undefined) normalizedInput.SubjectID = subjectID;

  return normalizedInput;
}

@Injectable()
export class ExamsService {
  constructor(
    @InjectRepository(Exam)
    private readonly examRepository: Repository<Exam>,
    @InjectRepository(Subject)
    private readonly subjectRepository: Repository<Subject>,
    @InjectRepository(Result)
    private readonly resultRepository: Repository<Result>,
    private readonly dataSource: DataSource,
  ) {}

  // =========================================================================
  // PHẦN 1: CÁC METHOD DÀNH CHO ADMIN
  // =========================================================================

  /**
   * [ADMIN] Thống kê tổng quan hệ thống thi
   */
  async getGeneralStatistics() {
    const totalExams = await this.examRepository.count();
    const totalResults = await this.resultRepository.count();

    // Tính điểm trung bình của toàn bộ hệ thống
    const results = await this.resultRepository.find({
      select: { Score: true },
    });
    let averageSystemScore = 0;

    if (results.length > 0) {
      const scores = results
        .map((r) => Number(r.Score))
        .filter((s) => !isNaN(s));
      averageSystemScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    }

    return {
      totalExams,
      totalSubmissions: totalResults,
      averageSystemScore: Number(averageSystemScore.toFixed(2)),
    };
  }

  /**
   * [ADMIN] Lấy tất cả bài thi (kể cả nháp, ẩn) kèm số lượng câu hỏi
   */
  async findAllForAdmin() {
    return this.getExamsListWithQuestionCount(true);
  }

  /**
   * [ADMIN] Lấy chi tiết đề thi (HIỂN THỊ CẢ ĐÁP ÁN ĐÚNG để Admin sửa)
   */
  async getExamDetailForAdmin(id: number) {
    const exam = await this.examRepository.findOne({
      where: { ExamID: id },
      relations: {
        Subject: true,
        examDetails: {
          Question: {
            answerChoices: true,
          },
        },
      },
      order: {
        examDetails: {
          QuestionOrder: 'ASC',
        },
      },
    });

    if (!exam) {
      throw new NotFoundException(`Không tìm thấy bài thi với ID = ${id}`);
    }

    return exam;
  }

  /**
   * [ADMIN] Lấy chi tiết Exam
   */
  /**
   * [ADMIN] Lấy chi tiết Exam cấu trúc rút gọn theo yêu cầu Client
   */
  /**
   * [ADMIN] Lấy chi tiết Exam cấu trúc rút gọn theo yêu cầu Client
   */
  async findOne(id: number) {
    // 1. Lấy dữ liệu đầy đủ từ Database
    const exam = await this.examRepository.findOne({
      where: { ExamID: id },
      relations: {
        Subject: true,
        examDetails: {
          Question: {
            answerChoices: true,
          },
        },
      },
      order: {
        examDetails: {
          QuestionOrder: 'ASC', // Sắp xếp thứ tự câu hỏi tăng dần
        },
      },
    });

    if (!exam) {
      throw new NotFoundException(`Không tìm thấy bài thi với ID = ${id}`);
    }

    // Kiểm tra an toàn cho ExamStructure đề phòng trường hợp không phải là Object
    const rules = Array.isArray(exam.ExamStructure?.rules)
      ? (exam.ExamStructure.rules as ExamRule[])
      : [];

    // 2. Định dạng (Map) lại dữ liệu theo đúng cấu trúc mong muốn
    return {
      ExamID: exam.ExamID,
      ExamName: exam.ExamName,
      TimeLimit: exam.TimeLimit,
      DateCreated: exam.DateCreated,

      // Định dạng lại thông tin Môn học (kiểm tra an toàn)
      Subject: exam.Subject
        ? {
            SubjectID: exam.Subject.SubjectID,
            SubjectName: exam.Subject.SubjectName,
          }
        : null,

      // Định dạng lại cấu trúc đề thi
      structure: rules.map((rule) => ({
        lessonId: rule?.id,
        knowledgeType: rule?.filters?.knowledgeType,
        count: rule?.count,
      })),

      // 💡 Thêm bước lọc (filter) để chắc chắn chỉ xử lý các detail CÓ chứa Question
      questions: (exam.examDetails || [])
        .filter((detail) => detail && detail.Question)
        .map((detail) => {
          const question = detail.Question;

          return {
            id: question.QuestionID,
            content: question.Content,
            difficulty: question.Difficulty,
            knowledgeType: question.KnowledgeType,

            // Lọc và định dạng danh sách câu trả lời
            choices: (question.answerChoices || []).map((choice) => ({
              id: choice.ChoiceID,
              content: choice.Content,
              isCorrect: choice.IsCorrectAnswer,
            })),
          };
        }),
    };
  }
  /**
   * [ADMIN] Tạo đề thi ngẫu nhiên (Transaction)
   */
  async create(createExamDto: CreateExamDto) {
    const normalizedCreate = normalizeExamInput(createExamDto);

    if (!normalizedCreate.SubjectID || !normalizedCreate.ExamStructure?.rules) {
      throw new BadRequestException(
        'SubjectID và examStructure.rules là bắt buộc',
      );
    }

    const subject = await this.subjectRepository.findOne({
      where: { SubjectID: normalizedCreate.SubjectID },
    });

    if (!subject) {
      throw new NotFoundException(
        `Không tìm thấy môn học với ID = ${normalizedCreate.SubjectID}`,
      );
    }

    return await this.dataSource.transaction(async (manager) => {
      const selectedQuestions: Question[] = [];
      const selectedQuestionIds = new Set<number>();
      const rules = normalizedCreate.ExamStructure.rules as ExamRule[];

      for (let i = 0; i < rules.length; i++) {
        const rule: ExamRule = rules[i];
        const ruleType = rule.type;
        const qb = manager
          .createQueryBuilder(Question, 'question')
          .leftJoin('question.Skill', 'skill')
          .leftJoin('skill.Lesson', 'lesson')
          .leftJoin('lesson.Chapter', 'chapter')
          .where('chapter.SubjectID = :subjectId', {
            subjectId: subject.SubjectID,
          });

        if (ruleType === 'chapter') {
          qb.andWhere('chapter.ChapterID = :id', { id: rule.id });
        } else if (ruleType === 'lesson') {
          qb.andWhere('lesson.LessonID = :id', { id: rule.id });
        } else if (ruleType === 'skill') {
          qb.andWhere('skill.SkillID = :id', { id: rule.id });
        } else {
          throw new BadRequestException(
            `Rule thứ ${i + 1} có loại hình không hợp lệ`,
          );
        }

        if (rule.filters?.difficulty) {
          qb.andWhere('question.Difficulty = :diff', {
            diff: rule.filters.difficulty,
          });
        }
        if (rule.filters?.knowledgeType) {
          qb.andWhere('question.KnowledgeType = :knowType', {
            knowType: rule.filters.knowledgeType,
          });
        }

        if (selectedQuestionIds.size > 0) {
          qb.andWhere('question.QuestionID NOT IN (:...ids)', {
            ids: Array.from(selectedQuestionIds),
          });
        }

        qb.orderBy('RAND()').take(rule.count);
        const ruleQuestions = await qb.getMany();

        if (ruleQuestions.length < rule.count) {
          throw new BadRequestException(
            `Không đủ câu hỏi cho rule thứ ${i + 1}. Yêu cầu: ${rule.count}, Tìm thấy: ${ruleQuestions.length}`,
          );
        }

        ruleQuestions.forEach((q) => {
          selectedQuestions.push(q);
          selectedQuestionIds.add(q.QuestionID);
        });
      }

      selectedQuestions.sort(() => Math.random() - 0.5);

      const exam = manager.create(Exam, normalizedCreate);
      const savedExam = await manager.save(exam);

      const examDetails = selectedQuestions.map((q, index) => {
        return manager.create(ExamDetail, {
          Exam: savedExam,
          Question: q,
          QuestionOrder: index + 1,
        });
      });
      await manager.save(ExamDetail, examDetails);

      return {
        message: 'Tạo đề thi thành công',
        exam: savedExam,
        totalQuestions: selectedQuestions.length,
      };
    });
  }

  /**
   * [ADMIN] Thống kê của 1 bài thi
   */
  async getExamStatistics(examId: number) {
    const exam = await this.findOne(examId);

    const results = await this.resultRepository.find({
      where: { Exam: { ExamID: examId } },
    });

    const totalAttempts = results.length;
    if (totalAttempts === 0) {
      return {
        examId,
        examName: exam.ExamName,
        totalAttempts: 0,
        averageScore: 0,
        highestScore: 0,
        lowestScore: 0,
      };
    }

    const scores = results.map((r) => Number(r.Score)).filter((s) => !isNaN(s));
    const averageScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    const highestScore = Math.max(...scores);
    const lowestScore = Math.min(...scores);

    return {
      examId,
      examName: exam.ExamName,
      totalAttempts,
      averageScore: Number(averageScore.toFixed(2)),
      highestScore,
      lowestScore,
    };
  }

  /**
   * [ADMIN] Cập nhật đề thi
   */
  async update(id: number, updateExamDto: UpdateExamDto) {
    const exam = await this.getExamEntityById(id);
    const normalizedUpdate = normalizeExamInput(updateExamDto);

    if (normalizedUpdate.SubjectID) {
      const subject = await this.subjectRepository.findOne({
        where: { SubjectID: normalizedUpdate.SubjectID },
      });
      if (!subject) throw new NotFoundException(`Không tìm thấy môn học`);
    }

    const updatedExam = this.examRepository.merge(exam, normalizedUpdate);
    return await this.examRepository.save(updatedExam);
  }

  /**
   * [ADMIN] Xóa đề thi
   */
  async remove(id: number) {
    const exam = await this.getExamEntityById(id);
    await this.examRepository.remove(exam);
    return { success: true, message: 'Xóa bài thi thành công' };
  }

  // =========================================================================
  // PHẦN 2: CÁC METHOD DÀNH CHO USER
  // =========================================================================

  /**
   * [USER] Lấy danh sách đề thi
   */
  async findAvailableExams() {
    return this.getExamsListWithQuestionCount(false);
  }

  /**
   * [USER] Lấy đề thi để làm bài (Ẩn đáp án đúng)
   */
  async getExamForTaking(id: number) {
    const exam = await this.examRepository.findOne({
      where: { ExamID: id },
      relations: {
        Subject: true,
        examDetails: {
          Question: {
            answerChoices: true,
          },
        },
      },
      order: {
        examDetails: {
          QuestionOrder: 'ASC',
        },
      },
    });

    if (!exam) {
      throw new NotFoundException(`Không tìm thấy bài thi với ID = ${id}`);
    }

    const questionsList = exam.examDetails.map((detail) => {
      const { Question } = detail;
      return {
        id: Question.QuestionID,
        order: detail.QuestionOrder,
        content: Question.Content,
        choices: Question.answerChoices.map((choice) => ({
          id: choice.ChoiceID,
          content: choice.Content,
          // Tuyệt đối không trả về isCorrectAnswer
        })),
      };
    });

    return {
      exam: {
        id: exam.ExamID,
        name: exam.ExamName,
        timeLimit: exam.TimeLimit,
        subject: exam.Subject.SubjectName,
        questions: questionsList,
      },
    };
  }

  /**
   * [USER] Nộp bài thi
   */
  async submitExam(
    userId: number,
    examId: number,
    answers: Record<number, number>,
    timeTaken: number,
  ) {
    return await this.dataSource.transaction(async (manager) => {
      const user = await manager.findOne(User, { where: { UserID: userId } });
      const exam = await manager.findOne(Exam, { where: { ExamID: examId } });

      if (!user) throw new NotFoundException('Không tìm thấy người dùng');
      if (!exam) throw new NotFoundException('Không tìm thấy bài thi');

      const examDetails = await manager.find(ExamDetail, {
        where: { Exam: { ExamID: examId } },
        relations: { Question: true },
      });

      const totalQuestions = examDetails.length;
      let correctCount = 0;

      const result = manager.create(Result, {
        User: user,
        Exam: exam,
        TimeTaken: timeTaken,
        Score: 0,
      });
      const savedResult = await manager.save(Result, result);

      const resultDetailsToSave: ResultDetail[] = [];

      for (const detail of examDetails) {
        const questionId = detail.Question.QuestionID;
        const selectedChoiceId = answers[questionId];
        let isCorrect = false;
        let choiceObj: AnswerChoice | undefined = undefined;

        if (selectedChoiceId) {
          const foundChoice = await manager.findOne(AnswerChoice, {
            where: { ChoiceID: selectedChoiceId },
          });
          if (foundChoice) {
            choiceObj = foundChoice;
            isCorrect = foundChoice.IsCorrectAnswer;
            if (isCorrect) correctCount++;
          }
        }

        resultDetailsToSave.push(
          manager.create(ResultDetail, {
            Result: savedResult,
            Question: detail.Question,
            SelectedChoice: choiceObj,
            IsCorrect: selectedChoiceId ? isCorrect : undefined,
          }),
        );
      }

      await manager.save(ResultDetail, resultDetailsToSave);

      const score =
        totalQuestions > 0 ? (correctCount / totalQuestions) * 10 : 0;
      savedResult.Score = Number(score.toFixed(2));
      await manager.save(Result, savedResult);

      return {
        success: true,
        result: {
          id: savedResult.ResultID,
          score: savedResult.Score,
          correctCount,
          totalQuestions,
          timeSpent: timeTaken,
        },
      };
    });
  }

  // =========================================================================
  // PHẦN 3: CÁC METHOD TIỆN ÍCH DÙNG CHUNG
  // =========================================================================

  /**
   * Helper method: Lấy danh sách Exam kèm theo việc đếm số câu hỏi
   * Được dùng chung bởi cả findAvailableExams và findAllForAdmin
   */
  /**
   * Helper method: Lấy danh sách Exam kèm theo việc đếm số câu hỏi
   * Được dùng chung bởi cả findAvailableExams và findAllForAdmin
   * @param isAdmin Quyết định xem có trả về các trường quản trị (DateCreated, ExamStructure...) hay không
   */
  private async getExamsListWithQuestionCount(isAdmin: boolean = false) {
    const exams = await this.examRepository.find({
      relations: { Subject: true },
      select: {
        ExamID: true,
        ExamName: true,
        TimeLimit: true,
        DateCreated: true, // Lấy ra để dành cho Admin
        ExamStructure: true, // Lấy ra cấu trúc đề dành riêng cho Admin
        Subject: {
          SubjectID: true,
          SubjectName: true,
        },
      },
      order: { DateCreated: 'DESC' },
    });

    const counts: Array<{ examId: string | number; count: string | number }> =
      await this.dataSource
        .getRepository(ExamDetail)
        .createQueryBuilder('detail')
        .select('detail.ExamID', 'examId')
        .addSelect('COUNT(detail.id)', 'count')
        .groupBy('detail.ExamID')
        .getRawMany();

    const countMap = new Map<number, number>();
    counts.forEach((c) => {
      countMap.set(Number(c.examId), Number(c.count));
    });

    // Bắt đầu phân tách dữ liệu trả về dựa trên role
    return exams.map((exam) => {
      // 1. Data cơ bản an toàn (Ai cũng được xem)
      const baseData = {
        ExamID: exam.ExamID,
        ExamName: exam.ExamName,
        TimeLimit: exam.TimeLimit,
        SubjectID: exam.Subject?.SubjectID,
        SubjectName: exam.Subject?.SubjectName,
        TotalQuestions: countMap.get(exam.ExamID) || 0,
      };

      // 2. Trả về cho ADMIN (Nhồi thêm các trường hậu trường)
      if (isAdmin) {
        return {
          ...baseData,
          DateCreated: exam.DateCreated,
          ExamStructure: exam.ExamStructure, // Giúp Admin biết đề này sinh ra theo rules nào
        };
      }

      // 3. Trả về cho USER
      return baseData;
    });
  }

  private async getExamEntityById(id: number) {
    const exam = await this.examRepository.findOne({
      where: { ExamID: id },
    });

    if (!exam) {
      throw new NotFoundException(`Không tìm thấy bài thi với ID = ${id}`);
    }

    return exam;
  }
}
