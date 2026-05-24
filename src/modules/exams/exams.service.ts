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
    // Tiêm DataSource để sử dụng Transaction
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Tạo đề thi ngẫu nhiên dựa trên cấu trúc (Transaction)
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

    // Bắt đầu Transaction
    return await this.dataSource.transaction(async (manager) => {
      const selectedQuestions: Question[] = [];
      const selectedQuestionIds = new Set<number>();

      const rules = normalizedCreate.ExamStructure.rules;

      // 1. Lọc và lấy câu hỏi ngẫu nhiên cho từng rule
      for (let i = 0; i < rules.length; i++) {
        const rule = rules[i];

        // Tạo QueryBuilder để truy vấn câu hỏi
        const qb = manager
          .createQueryBuilder(Question, 'question')
          .leftJoin('question.Skill', 'skill')
          .leftJoin('skill.Lesson', 'lesson')
          .leftJoin('lesson.Chapter', 'chapter')
          .where('chapter.SubjectID = :subjectId', {
            subjectId: subject.SubjectID,
          });

        // Lọc theo loại hình (chương, bài học, kỹ năng)
        if (rule.type === 'chapter') {
          qb.andWhere('chapter.ChapterID = :id', { id: rule.id });
        } else if (rule.type === 'lesson') {
          qb.andWhere('lesson.LessonID = :id', { id: rule.id });
        } else if (rule.type === 'skill') {
          qb.andWhere('skill.SkillID = :id', { id: rule.id });
        } else {
          throw new BadRequestException(
            `Rule thứ ${i + 1} có loại hình không hợp lệ: ${rule.type}`,
          );
        }

        // Lọc theo độ khó / loại kiến thức
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

        // Loại trừ các câu hỏi đã được chọn ở rule trước đó
        if (selectedQuestionIds.size > 0) {
          qb.andWhere('question.QuestionID NOT IN (:...ids)', {
            ids: Array.from(selectedQuestionIds),
          });
        }

        // Sắp xếp ngẫu nhiên và lấy số lượng theo rule (Dùng RAND() cho MySQL)
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

      // Trộn lẫn lại toàn bộ câu hỏi
      selectedQuestions.sort(() => Math.random() - 0.5);

      // 2. Tạo bản ghi Exam
      const exam = manager.create(Exam, normalizedCreate);
      const savedExam = await manager.save(exam);

      // 3. Tạo các bản ghi ExamDetail bằng Bulk Insert
      const examDetails = selectedQuestions.map((q, index) => {
        return manager.create(ExamDetail, {
          Exam: savedExam,
          Question: q,
          QuestionOrder: index + 1,
        });
      });
      await manager.save(ExamDetail, examDetails);

      return {
        success: true,
        message: 'Tạo đề thi thành công',
        exam: savedExam,
        totalQuestions: selectedQuestions.length,
      };
    });
  }

  /**
   * Lấy danh sách đề thi
   */
  async findAll() {
    // Bước 1: Lấy danh sách đề thi và môn học, chỉ lấy các cột cần thiết
    const exams = await this.examRepository.find({
      relations: { Subject: true },
      select: {
        ExamID: true,
        ExamName: true,
        TimeLimit: true,
        DateCreated: true,
        Subject: {
          SubjectID: true,
          SubjectName: true,
        },
      },
      order: { DateCreated: 'DESC' },
    });

    // Bước 2: Truy vấn đếm số lượng câu hỏi gộp theo từng mã Đề thi (ExamID)
    // Lưu ý: Chúng ta dùng trực tiếp dataSource đã được khai báo ở trên để gọi Repo
    const counts = await this.dataSource
      .getRepository(ExamDetail)
      .createQueryBuilder('detail')
      .select('detail.ExamID', 'examId') // Lấy ID của đề thi
      .addSelect('COUNT(detail.id)', 'count') // Đếm số lượng bản ghi
      .groupBy('detail.ExamID') // Nhóm lại theo từng đề
      .getRawMany();

    // Bước 3: Đưa kết quả đếm vào một Map (Từ điển) để ghép nối dữ liệu cực nhanh
    // Cấu trúc Map sẽ giống như: { 16: 10, 13: 10, 9: 10 } (ExamID: Số lượng câu hỏi)
    const countMap = new Map<number, number>();
    counts.forEach((c) => {
      countMap.set(c.examId, Number(c.count));
    });

    // Bước 4: Trả về dữ liệu cuối cùng cho Frontend
    return exams.map((exam) => ({
      ExamID: exam.ExamID,
      ExamName: exam.ExamName,
      TimeLimit: exam.TimeLimit,
      DateCreated: exam.DateCreated,
      SubjectID: exam.Subject?.SubjectID,
      SubjectName: exam.Subject?.SubjectName,
      TotalQuestions: countMap.get(exam.ExamID) || 0, // Ghép số lượng lấy từ Map
    }));
  }

  async findOne(id: number) {
    const exam = await this.examRepository.findOne({
      where: { ExamID: id },
      relations: { Subject: true, examDetails: true, results: true },
    });
    if (!exam)
      throw new NotFoundException(`Không tìm thấy bài thi với ID = ${id}`);
    return exam;
  }

  /**
   * Lấy đề thi để làm bài (Có câu hỏi, lựa chọn nhưng ẩn đáp án đúng)
   */
  async getExamForTaking(id: number) {
    // 1. Tìm đề thi cùng các mối quan hệ cần thiết
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
      // 💡 CẢI TIẾN: Sắp xếp ngay tại Database thay vì dùng .sort() ở dưới
      order: {
        examDetails: {
          QuestionOrder: 'ASC',
        },
      },
    });

    if (!exam) {
      throw new NotFoundException(`Không tìm thấy bài thi với ID = ${id}`);
    }

    // 2. Chuyển đổi dữ liệu (Mapping)
    const questionsList = exam.examDetails.map((detail) => {
      const { Question } = detail;
      return {
        id: Question.QuestionID,
        order: detail.QuestionOrder,
        content: Question.Content,
        choices: Question.answerChoices.map((choice) => ({
          id: choice.ChoiceID,
          content: choice.Content,
          // Tuyệt đối không bao gồm 'IsCorrectAnswer' ở đây
        })),
      };
    });

    // 3. Trả về cấu trúc dữ liệu tinh gọn cho học sinh
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
   * Nộp bài thi, chấm điểm và lưu kết quả (Transaction)
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

      // 💡 ĐÃ SỬA LỖI 1: Đổi ['Question'] thành { Question: true }
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

      // 💡 ĐÃ SỬA LỖI 4 & 5: Khai báo rõ kiểu dữ liệu cho mảng ResultDetail[]
      const resultDetailsToSave: ResultDetail[] = [];

      for (const detail of examDetails) {
        const questionId = detail.Question.QuestionID;
        const selectedChoiceId = answers[questionId];
        let isCorrect = false;

        // 💡 GIẢI PHÁP: Sử dụng undefined thay vì null
        let choiceObj: AnswerChoice | undefined = undefined;

        if (selectedChoiceId) {
          // Dùng biến tạm để TypeScript tự động hiểu kiểu dữ liệu
          const foundChoice = await manager.findOne(AnswerChoice, {
            where: { ChoiceID: selectedChoiceId },
          });
          if (foundChoice) {
            choiceObj = foundChoice;
            isCorrect = foundChoice.IsCorrectAnswer; // Hoặc foundChoice.isCorrectAnswer tùy thuộc vào AnswerChoice Entity
            if (isCorrect) correctCount++;
          }
        }

        resultDetailsToSave.push(
          manager.create(ResultDetail, {
            Result: savedResult, // Khớp với @ManyToOne() Result: Result;
            Question: detail.Question, // Khớp với @ManyToOne() Question: Question;
            SelectedChoice: choiceObj, // Truyền undefined nếu không có
            IsCorrect: selectedChoiceId ? isCorrect : undefined, // Truyền undefined nếu không có
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
  /**
   * Thống kê kết quả bài thi
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

  async update(id: number, updateExamDto: UpdateExamDto) {
    const exam = await this.findOne(id);
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

  async remove(id: number) {
    const exam = await this.findOne(id);
    await this.examRepository.remove(exam);
    return { success: true, message: 'Xóa bài thi thành công' };
  }
}
