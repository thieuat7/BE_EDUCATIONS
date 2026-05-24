import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, DataSource } from 'typeorm';
import { Result } from './entities/result.entity';
import { ResultDetail } from './entities/result-detail.entity';
import { Exam } from '@modules/exams/entities/exam.entity';
import { Question } from '@modules/questions/entities/question.entity';
import { AnswerChoice } from '@modules/exams/entities/answer-choice.entity';
import { User } from '@modules/users/entities/user.entity';
import { AnalyticsEngineService } from '@modules/ai-services/analytics-engine.service';

@Injectable()
export class ResultsService {
  constructor(
    @InjectRepository(Result) private resultRepo: Repository<Result>,
    @InjectRepository(ResultDetail)
    private resultDetailRepo: Repository<ResultDetail>,
    @InjectRepository(Exam) private examRepo: Repository<Exam>,
    @InjectRepository(Question) private questionRepo: Repository<Question>,
    @InjectRepository(AnswerChoice)
    private answerChoiceRepo: Repository<AnswerChoice>,
    @InjectRepository(User) private userRepo: Repository<User>,
    private dataSource: DataSource,
    private analyticsEngine: AnalyticsEngineService,
  ) {}

  // 💡 Lấy danh sách kết quả chung
  async listResults(limit?: number) {
    const results = await this.resultRepo.find({
      relations: { User: true, Exam: { Subject: true } },
      order: { DateTaken: 'DESC' },
      take: limit,
    });
    return this.mapBasicResults(results);
  }

  // 💡 Lấy danh sách kết quả theo User
  async listResultByUser(userId: number, limit?: number) {
    const results = await this.resultRepo.find({
      where: { User: { UserID: userId } },
      relations: { Exam: { Subject: true } },
      order: { DateTaken: 'DESC' },
      take: limit,
    });
    return this.mapBasicResults(results);
  }

  // 💡 Lấy chi tiết một kết quả theo ID
  async getResultById(resultId: number) {
    const result = await this.resultRepo.findOne({
      where: { ResultID: resultId },
      relations: { User: true, Exam: { Subject: true } },
    });
    if (!result) return null;
    return this.mapBasicResults([result])[0];
  }

  // 💡 Hàm Helper: Chuẩn hóa dữ liệu trả về
  private mapBasicResults(results: Result[]) {
    return results.map((result) => ({
      id: result.ResultID,
      score: result.Score,
      timeTaken: result.TimeTaken,
      completedAt: result.DateTaken,

      ...(result.User && {
        user: {
          id: result.User.UserID,
          fullName: result.User.FullName,
          email: result.User.Email,
        },
      }),

      exam: result.Exam
        ? {
            id: result.Exam.ExamID,
            name: result.Exam.ExamName,
            timeLimit: result.Exam.TimeLimit,
            subject: result.Exam.Subject?.SubjectName,
          }
        : null,
    }));
  }
  // 💡 Phân tích điểm yếu kiến thức (Dùng QueryBuilder)
  async analyzeKnowledgeWeakness(
    userId: number,
    knowledgeType: string,
    monhocId?: string,
  ) {
    const qb = this.resultDetailRepo
      .createQueryBuilder('rd')
      .innerJoin('rd.Result', 'result')
      .innerJoin('rd.Question', 'question')
      .innerJoin('question.Skill', 'skill')
      .where('result.UserID = :userId', { userId })
      .andWhere('question.KnowledgeType = :knowledgeType', { knowledgeType });

    if (monhocId) {
      qb.innerJoin('result.Exam', 'exam').andWhere(
        'exam.SubjectID = :monhocId',
        { monhocId },
      );
    }

    const latestDetails = await qb
      .select(['rd', 'question', 'skill', 'result'])
      .orderBy('rd.QuestionID')
      .addOrderBy('result.DateTaken', 'DESC')
      .getMany();

    const uniqueQuestionsMap = new Map<number, ResultDetail>();
    latestDetails.forEach((detail) => {
      if (!uniqueQuestionsMap.has(detail.QuestionID)) {
        uniqueQuestionsMap.set(detail.QuestionID, detail);
      }
    });
    const distinctDetails = Array.from(uniqueQuestionsMap.values());

    const skillStats = {};
    // 💡 ĐÃ SỬA: Định nghĩa rõ ràng đây là mảng các số nguyên (number)
    const wrongQuestionIds: number[] = [];

    distinctDetails.forEach((detail) => {
      const skillId = detail.Question.SkillID;
      if (!skillStats[skillId]) {
        skillStats[skillId] = {
          skill_id: skillId,
          skillName: detail.Question.Skill?.SkillName,
          total_answered: 0,
          total_wrong: 0,
          total_correct: 0,
        };
      }
      skillStats[skillId].total_answered++;

      if (detail.IsCorrect) {
        skillStats[skillId].total_correct++;
      } else {
        skillStats[skillId].total_wrong++;
        wrongQuestionIds.push(detail.QuestionID);
      }
    });

    const aiAnalysisResults = {};
    const aiTextResult = 'Đang phân tích...';

    // 💡 ĐÃ SỬA: Định nghĩa rõ ràng đây là mảng chứa các đối tượng bất kỳ (any)
    let finalWrongQuestions: any[] = [];
    if (wrongQuestionIds.length > 0) {
      const wrongQuestionsData = await this.questionRepo.find({
        where: { QuestionID: In(wrongQuestionIds) },
        relations: { Skill: true },
      });

      const correctAnswers = await this.answerChoiceRepo.find({
        where: {
          Question: { QuestionID: In(wrongQuestionIds) },
          IsCorrectAnswer: true,
        },
        relations: { Question: true },
      });

      const answersMap = new Map();
      correctAnswers.forEach((ans) =>
        answersMap.set(ans.Question.QuestionID, ans.Content),
      );

      finalWrongQuestions = wrongQuestionsData.map((q) => ({
        questionId: q.QuestionID,
        content: q.Content,
        skillName: q.Skill?.SkillName,
        correctAnswer: answersMap.get(q.QuestionID) || 'Chưa cập nhật đáp án',
      }));
    }

    return {
      userId,
      knowledgeType,
      subjectId: monhocId || 'all',
      aiAnalysis: aiAnalysisResults,
      aiTextResult: aiTextResult,
      wrongQuestions: finalWrongQuestions,
    };
  }

  // 💡 Lấy chi tiết bài làm kèm đáp án
  async getResultDetailsWithAnswers(resultId: number) {
    const result = await this.resultRepo.findOne({
      where: { ResultID: resultId },
      relations: { User: true, Exam: { Subject: true } },
    });

    if (!result) return null;

    const details = await this.resultDetailRepo.find({
      where: { Result: { ResultID: resultId } },
      relations: {
        Question: {
          Skill: true,
          answerChoices: true,
        },
        SelectedChoice: true,
      },
      order: { Question: { QuestionID: 'ASC' } },
    });

    let correctCount = 0;
    const questionsDetail = details.map((detail) => {
      const allChoices = detail.Question.answerChoices || [];
      const correctAnswer = allChoices.find((c) => c.IsCorrectAnswer);
      const isCorrect = detail.IsCorrect || false;
      if (isCorrect) correctCount++;

      return {
        question: {
          id: detail.Question.QuestionID,
          content: detail.Question.Content,
          difficulty: detail.Question.Difficulty,
          knowledgeType: detail.Question.KnowledgeType,
          skillName: detail.Question.Skill?.SkillName,
        },
        allChoices: allChoices.map((c) => ({
          id: c.ChoiceID,
          content: c.Content,
          isCorrect: c.IsCorrectAnswer,
        })),
        userAnswer: detail.SelectedChoice
          ? {
              id: detail.SelectedChoice.ChoiceID,
              content: detail.SelectedChoice.Content,
            }
          : null,
        correctAnswer: correctAnswer
          ? { id: correctAnswer.ChoiceID, content: correctAnswer.Content }
          : null,
        isCorrect,
      };
    });

    const totalQuestions = details.length;
    return {
      result: {
        id: result.ResultID,
        score: result.Score,
        timeTaken: result.TimeTaken,
        dateTaken: result.DateTaken,
        correctCount,
        totalQuestions,
        percentage:
          totalQuestions > 0 ? (correctCount / totalQuestions) * 100 : 0,
        exam: {
          id: result.Exam.ExamID,
          name: result.Exam.ExamName,
          timeLimit: result.Exam.TimeLimit,
          subject: result.Exam.Subject?.SubjectName,
        },
        user: {
          id: result.User.UserID,
          fullName: result.User.FullName,
          email: result.User.Email,
        },
        questions: questionsDetail,
      },
    };
  }

  // 💡 Lấy phân tích kết quả bài thi (có tích hợp AI commentary)
  async getResultAnalysis(resultId: number) {
    const result = await this.resultRepo.findOne({
      where: { ResultID: resultId },
      relations: { User: true },
    });
    if (!result) return null;

    const totalQuestions = await this.resultDetailRepo.count({
      where: { Result: { ResultID: resultId } },
    });

    const incorrectDetails = await this.resultDetailRepo.find({
      where: { Result: { ResultID: resultId }, IsCorrect: false },
      relations: { Question: { Skill: true } },
    });

    const knowledgeCount: Record<string, number> = {};
    const skillCount: Record<string, number> = {};
    const difficultyCount: Record<string, number> = {};
    let countEasyAndConcept = 0;

    incorrectDetails.forEach((detail) => {
      const q = detail.Question;

      knowledgeCount[q.KnowledgeType] =
        (knowledgeCount[q.KnowledgeType] || 0) + 1;

      if (q.Skill) {
        skillCount[q.Skill.SkillName] =
          (skillCount[q.Skill.SkillName] || 0) + 1;
      }

      difficultyCount[q.Difficulty] = (difficultyCount[q.Difficulty] || 0) + 1;

      if (q.Difficulty === 'De' && q.KnowledgeType === 'KhaiNiem') {
        countEasyAndConcept++;
      }
    });

    const statisticsData = {
      totalIncorrect: incorrectDetails.length,
      weaknessByKnowledge: Object.keys(knowledgeCount).map((k) => ({
        type: k,
        name: k,
        count: knowledgeCount[k],
      })),
      weaknessBySkill: Object.keys(skillCount).map((s) => ({
        skillName: s,
        count: skillCount[s],
      })),
      weaknessByDifficulty: Object.keys(difficultyCount).map((d) => ({
        type: d,
        name: d,
        count: difficultyCount[d],
      })),
      easyConceptMistakes: countEasyAndConcept,
      timeTaken: result.TimeTaken,
      totalQuestions,
    };

    // Gọi AI commentary
    const aiAnalysis =
      await this.analyticsEngine.generateAiCommentary(statisticsData);
    const aiAnalysisResult = aiAnalysis.messages.join('\n');

    return {
      ownerID: result.User.UserID,
      summary: {
        statistics: statisticsData,
        analysis: aiAnalysisResult,
      },
    };
  }

  // 💡 Các hàm thống kê & người dùng
  async getUserResults(userId: number, monhocId?: string, limit?: number) {
    const whereCondition: any = { User: { UserID: userId } };
    if (monhocId) {
      whereCondition.Exam = { Subject: { SubjectID: monhocId } };
    }

    const results = await this.resultRepo.find({
      where: whereCondition,
      relations: { Exam: { Subject: true } },
      order: { DateTaken: 'DESC' },
      take: limit,
    });
    return this.mapBasicResults(results);
  }

  async getExamResults(examId: number, limit?: number) {
    const results = await this.resultRepo.find({
      where: { Exam: { ExamID: examId } },
      relations: { User: true },
      order: { Score: 'DESC', DateTaken: 'DESC' },
      take: limit,
    });
    return this.mapBasicResults(results);
  }

  async getUserStatistics(userId: number) {
    const stats = await this.resultRepo
      .createQueryBuilder('result')
      .leftJoin('result.Exam', 'exam')
      .where('result.UserID = :userId', { userId })
      .select([
        'COUNT(result.ResultID) as totalExams',
        'AVG(result.Score) as avgScore',
        'MAX(result.Score) as maxScore',
        'MIN(result.Score) as minScore',
        'AVG(result.TimeTaken) as avgTime',
      ])
      .getRawOne();

    const subjectStats = await this.resultRepo
      .createQueryBuilder('result')
      .leftJoin('result.Exam', 'exam')
      .leftJoin('exam.Subject', 'subject')
      .where('result.UserID = :userId', { userId })
      .select([
        'subject.SubjectName as subject',
        'COUNT(result.ResultID) as totalExams',
        'AVG(result.Score) as averageScore',
        'MAX(result.Score) as highestScore',
        'MIN(result.Score) as lowestScore',
      ])
      .groupBy('subject.SubjectID, subject.SubjectName')
      .getRawMany();

    return {
      totalExams: parseInt(stats.totalexams) || 0,
      averageScore: parseFloat(stats.avgscore) || 0,
      highestScore: parseFloat(stats.maxscore) || 0,
      lowestScore: parseFloat(stats.minscore) || 0,
      averageTime: parseFloat(stats.avgtime) || 0,
      bySubject: subjectStats.map((s) => ({
        subject: s.subject,
        totalExams: parseInt(s.totalexams),
        averageScore: parseFloat(s.averagescore),
        highestScore: parseFloat(s.highestscore),
        lowestScore: parseFloat(s.lowestscore),
      })),
    };
  }

  async getExamStatistics(examId: number) {
    const stats = await this.resultRepo
      .createQueryBuilder('result')
      .where('result.ExamID = :examId', { examId })
      .select([
        'COUNT(result.ResultID) as totalAttempts',
        'AVG(result.Score) as avgScore',
        'MAX(result.Score) as maxScore',
        'MIN(result.Score) as minScore',
        'AVG(result.TimeTaken) as avgTime',
      ])
      .getRawOne();

    return {
      examId,
      totalAttempts: parseInt(stats.totalattempts) || 0,
      statistics: {
        averageScore: parseFloat(stats.avgscore) || 0,
        highestScore: parseFloat(stats.maxscore) || 0,
        lowestScore: parseFloat(stats.minscore) || 0,
        averageTime: parseFloat(stats.avgtime) || 0,
      },
    };
  }

  async getSkillPerformance(userId: number) {
    const details = await this.resultDetailRepo.find({
      where: { Result: { User: { UserID: userId } } },
      relations: { Question: { Skill: true } },
    });

    const skillStats = {};
    details.forEach((d) => {
      const skill = d.Question.Skill;
      if (!skill) return;
      if (!skillStats[skill.SkillID]) {
        skillStats[skill.SkillID] = {
          skillName: skill.SkillName,
          total: 0,
          correct: 0,
        };
      }
      skillStats[skill.SkillID].total++;
      if (d.IsCorrect) skillStats[skill.SkillID].correct++;
    });

    return Object.values(skillStats)
      .map((s: any) => ({
        skillName: s.skillName,
        totalQuestions: s.total,
        correctAnswers: s.correct,
        accuracy: s.total > 0 ? (s.correct / s.total) * 100 : 0,
      }))
      .sort((a, b) => a.accuracy - b.accuracy);
  }

  async getPerformanceTrend(userId: number, days: number = 30) {
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);

    const results = await this.resultRepo
      .createQueryBuilder('result')
      .leftJoinAndSelect('result.Exam', 'exam')
      .where('result.UserID = :userId', { userId })
      .andWhere('result.DateTaken >= :fromDate', { fromDate })
      .orderBy('result.DateTaken', 'ASC')
      .getMany();

    return results.map((r) => ({
      date: r.DateTaken,
      score: r.Score,
      examName: r.Exam?.ExamName,
    }));
  }

  async getDifficultyAnalysis(userId: number) {
    const details = await this.resultDetailRepo.find({
      where: { Result: { User: { UserID: userId } } },
      relations: { Question: true },
    });

    const difficultyMap = { De: 'Easy', TrungBinh: 'Medium', Kho: 'Hard' };
    const stats = {
      Easy: { total: 0, correct: 0 },
      Medium: { total: 0, correct: 0 },
      Hard: { total: 0, correct: 0 },
    };

    details.forEach((d) => {
      const engDiff =
        difficultyMap[d.Question.Difficulty] || d.Question.Difficulty;
      if (stats[engDiff]) {
        stats[engDiff].total++;
        if (d.IsCorrect) stats[engDiff].correct++;
      }
    });

    Object.keys(stats).forEach((k) => {
      stats[k].accuracy =
        stats[k].total > 0 ? (stats[k].correct / stats[k].total) * 100 : 0;
    });

    return stats;
  }

  async compareUsers(userIds: number[]) {
    // 💡 ĐÃ SỬA: Định nghĩa rõ ràng đây là mảng chứa các đối tượng bất kỳ (any)
    const comparison: any[] = [];
    for (const userId of userIds) {
      const user = await this.userRepo.findOne({ where: { UserID: userId } });
      if (!user) continue;

      const stats = await this.getUserStatistics(userId);
      comparison.push({
        user: { id: user.UserID, fullName: user.FullName, email: user.Email },
        statistics: stats,
      });
    }
    return comparison;
  }

  async getLeaderboard(examId?: number, monhocId?: string, limit: number = 10) {
    const qb = this.resultRepo
      .createQueryBuilder('result')
      .innerJoin('result.User', 'user')
      .innerJoin('result.Exam', 'exam')
      .select([
        'user.UserID AS userId',
        'user.FullName AS fullName',
        'user.Email AS email',
        'MAX(result.Score) AS bestScore',
        'COUNT(result.ResultID) AS totalAttempts',
      ]);

    if (examId) qb.andWhere('exam.ExamID = :examId', { examId });
    if (monhocId) qb.andWhere('exam.SubjectID = :monhocId', { monhocId });

    const rawResults = await qb
      .groupBy('user.UserID, user.FullName, user.Email')
      .orderBy('bestScore', 'DESC')
      .limit(limit)
      .getRawMany();

    return rawResults.map((r, index) => ({
      rank: index + 1,
      user: { id: r.userid, fullName: r.fullname, email: r.email },
      bestScore: parseFloat(r.bestscore),
      totalAttempts: parseInt(r.totalattempts),
    }));
  }

  async deleteResult(resultId: number) {
    const result = await this.resultRepo.findOne({
      where: { ResultID: resultId },
    });
    if (!result) throw new NotFoundException('Kết quả không tồn tại');
    await this.resultRepo.remove(result);
  }
}
