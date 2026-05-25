import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

// --- 1. CẤU TRÚC DỮ LIỆU & HẰNG SỐ ---

export enum ConfidenceLevel {
  HIGH = 'Cao',
  MEDIUM = 'Trung bình',
  LOW = 'Thấp',
  VERY_LOW = 'Rất thấp',
}

export enum SkillCategory {
  CRITICAL = 'Điểm yếu nghiêm trọng', // Màu Đỏ
  IMPROVE = 'Cần cải thiện', // Màu Cam
  AVERAGE = 'Trung bình', // Màu Vàng
  STRONG = 'Điểm mạnh', // Màu Xanh
  INSUFFICIENT = 'Chưa đủ dữ liệu', // Màu Xám
}

export interface SkillAnalysisResult {
  skillId: number;
  skillName: string;
  totalAnswered: number;
  totalWrong: number;
  totalCorrect: number;
  wrongRate: number;
  accuracyRate: number;
  category: SkillCategory;
  confidence: ConfidenceLevel;
  priorityScore: number;
}

export interface RawSkillStats {
  skill_id: number;
  skillName: string;
  total_answered: number;
  total_wrong: number;
  total_correct: number;
}

// --- 2. CLASS PHÂN TÍCH CHÍNH ---

@Injectable()
export class KnowledgeAnalyzerService {
  private readonly logger = new Logger(KnowledgeAnalyzerService.name);

  private readonly minAttemptsThreshold = 3;
  private readonly criticalWeaknessRate = 60.0;
  private readonly needsImprovementRate = 30.0;
  private readonly strengthRate = 85.0;
  private readonly confHighThreshold = 20;
  private readonly confMediumThreshold = 10;

  constructor(private configService: ConfigService) {}

  public async analyze(rawStatsData: RawSkillStats[]): Promise<any> {
    const state = {
      analyzedSkills: [] as SkillAnalysisResult[],
      criticalWeaknesses: [] as SkillAnalysisResult[],
      needsImprovement: [] as SkillAnalysisResult[],
      averageSkills: [] as SkillAnalysisResult[],
      strengths: [] as SkillAnalysisResult[],
      insufficientData: [] as SkillAnalysisResult[],
    };

    this.processAndClassifySkills(rawStatsData, state);
    const overallStats = this.calculateOverallStats(
      state.analyzedSkills,
      state,
    );
    const { insights, aiTextResult } = await this.generateInsights(
      state,
      overallStats,
    );

    return {
      aiAnalysis: {
        overallStats,
        insights,
        criticalWeaknesses: state.criticalWeaknesses,
        needsImprovement: state.needsImprovement,
        strengths: state.strengths,
        insufficientData: state.insufficientData,
        allSkillSummary: state.analyzedSkills,
      },
      aiTextResult,
    };
  }

  private calculatePriorityScore(
    wrongRate: number,
    total: number,
    category: SkillCategory,
  ): number {
    const severityMultiplier = category === SkillCategory.CRITICAL ? 1.5 : 1.0;
    const cappedTotal = Math.min(total, 50);
    const score = wrongRate * Math.log2(cappedTotal + 2) * severityMultiplier;
    return Math.round(score * 100) / 100;
  }

  private processAndClassifySkills(
    rawStatsData: RawSkillStats[],
    state: any,
  ): void {
    for (const item of rawStatsData) {
      const total = item.total_answered || 0;
      if (total === 0) continue;

      const skillId = item.skill_id;
      const skillName = item.skillName || `Unknown Skill (${skillId})`;
      const totalWrong = item.total_wrong || 0;
      const totalCorrect = item.total_correct || 0;

      const wrongRate = (totalWrong / total) * 100;
      const accuracyRate = (totalCorrect / total) * 100;
      const confidence = this.getConfidenceLevel(total);

      let category = SkillCategory.INSUFFICIENT;
      if (total >= this.minAttemptsThreshold) {
        if (wrongRate >= this.criticalWeaknessRate) {
          category = SkillCategory.CRITICAL;
        } else if (wrongRate >= this.needsImprovementRate) {
          category = SkillCategory.IMPROVE;
        } else if (accuracyRate >= this.strengthRate) {
          category = SkillCategory.STRONG;
        } else {
          category = SkillCategory.AVERAGE;
        }
      }

      const priorityScore = this.calculatePriorityScore(
        wrongRate,
        total,
        category,
      );

      const skillResult: SkillAnalysisResult = {
        skillId,
        skillName,
        totalAnswered: total,
        totalWrong,
        totalCorrect,
        wrongRate: Math.round(wrongRate * 100) / 100,
        accuracyRate: Math.round(accuracyRate * 100) / 100,
        category,
        confidence,
        priorityScore,
      };

      state.analyzedSkills.push(skillResult);

      if (category === SkillCategory.CRITICAL)
        state.criticalWeaknesses.push(skillResult);
      else if (category === SkillCategory.IMPROVE)
        state.needsImprovement.push(skillResult);
      else if (category === SkillCategory.STRONG)
        state.strengths.push(skillResult);
      else if (category === SkillCategory.AVERAGE)
        state.averageSkills.push(skillResult);
      else state.insufficientData.push(skillResult);
    }

    state.criticalWeaknesses.sort((a, b) => b.priorityScore - a.priorityScore);
    state.needsImprovement.sort((a, b) => b.priorityScore - a.priorityScore);
    state.strengths.sort((a, b) => {
      if (b.accuracyRate !== a.accuracyRate)
        return b.accuracyRate - a.accuracyRate;
      return b.totalAnswered - a.totalAnswered;
    });
    state.analyzedSkills.sort((a, b) => a.accuracyRate - b.accuracyRate);
  }

  private async generateInsights(
    state: any,
    stats: any,
  ): Promise<{ insights: any[]; aiTextResult: string | null }> {
    const insights: Array<{ type: string; message: string; data?: any }> = [];

    // Insight 1: Tổng quan
    insights.push({
      type: 'overall',
      message: `Tổng quan: Độ chính xác ${stats.overallAccuracy}%. Bạn có ${stats.criticalWeaknessCount} vấn đề nghiêm trọng.`,
      data: stats,
    });

    // Insight 2: Critical
    if (state.criticalWeaknesses.length > 0) {
      const topWeak = state.criticalWeaknesses[0];
      insights.push({
        type: 'critical_weakness',
        message: `Cần khắc phục ngay: Kỹ năng '${topWeak.skillName}' (Sai ${topWeak.wrongRate}% trên ${topWeak.totalAnswered} câu).`,
        data: topWeak,
      });
    }

    // Insight 3: Strength
    if (state.strengths.length > 0) {
      const topStrength = state.strengths[0];
      insights.push({
        type: 'strength',
        message: `Điểm sáng: Kỹ năng '${topStrength.skillName}' rất vững (Đúng ${topStrength.accuracyRate}%).`,
        data: topStrength,
      });
    }

    let aiTextResult: string | null = null;
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');

    // 💡 TẠM TẮT AI: Gán biến này bằng true nếu muốn bật lại AI
    const isAiEnabled = false;

    if (isAiEnabled && apiKey) {
      const details: string[] = [];
      if (state.criticalWeaknesses.length > 0) {
        details.push('\nTop 3 điểm yếu cần ưu tiên xử lý:');
        for (const s of state.criticalWeaknesses.slice(0, 3)) {
          details.push(
            `- ${s.skillName}: sai ${s.wrongRate}% (Dữ liệu từ ${s.totalAnswered} câu)`,
          );
        }
      }

      const rawMessages = insights.map((item) => item.message);
      if (details.length > 0) {
        rawMessages.push(details.join('\n'));
      }

      const aiOutputList = await this.rewriteFeedbackWithAi(
        rawMessages,
        apiKey,
      );
      if (aiOutputList && aiOutputList.length > 0) {
        aiTextResult = aiOutputList[0];
      }
    } else {
      // Khi AI tắt, tạo một thông báo mặc định dựa trên dữ liệu hệ thống
      this.logger.log('ℹ️ AI Rewrite đang bị tắt. Sử dụng văn bản mặc định.');
      const rawMessages = insights.map((item) => item.message);
      aiTextResult =
        'Hệ thống AI hiện đang tạm tắt. \n' + rawMessages.join('\n');
    }

    return { insights, aiTextResult };
  }

  private async rewriteFeedbackWithAi(
    rawMessages: string[],
    apiKey: string,
  ): Promise<string[]> {
    const inputText = rawMessages.join('\n');

    const prompt = `
Dữ liệu phân tích học tập:
---
${inputText}
---
NHIỆM VỤ: Viết đoạn nhận xét lộ trình học tập (80-100 từ).

QUY TẮC BẮT BUỘC:
1. Gọi người dùng là "bạn". KHÔNG xưng "tôi/hệ thống/AI".
2. Văn phong: Khách quan, xây dựng, tập trung vào giải pháp.
3. Cấu trúc: 
   - Câu 1: Đánh giá nhanh tình hình hiện tại.
   - Câu 2: Chỉ rõ kỹ năng yếu nhất cần làm ngay.
   - Câu 3: Đưa ra hành động cụ thể (VD: Ôn lại lý thuyết, làm bài tập chuyên đề).
`;

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      const response = await model.generateContent(prompt);
      return [response.response.text()];
    } catch (error) {
      this.logger.error(`⚠️ AI Error: ${error.message}`);
      return [rawMessages.join('\n')];
    }
  }

  private calculateOverallStats(
    analyzedSkills: SkillAnalysisResult[],
    state: any,
  ): any {
    const totalAnswered = analyzedSkills.reduce(
      (sum, s) => sum + s.totalAnswered,
      0,
    );
    const totalCorrect = analyzedSkills.reduce(
      (sum, s) => sum + s.totalCorrect,
      0,
    );
    const overallAcc =
      totalAnswered > 0 ? (totalCorrect / totalAnswered) * 100 : 0.0;

    return {
      totalSkillsAnalyzed: analyzedSkills.length,
      totalQuestionsAnswered: totalAnswered,
      overallAccuracy: Math.round(overallAcc * 100) / 100,
      criticalWeaknessCount: state.criticalWeaknesses.length,
      needsImprovementCount: state.needsImprovement.length,
      strengthCount: state.strengths.length,
      insufficientDataCount: state.insufficientData.length,
    };
  }

  private getConfidenceLevel(totalAnswered: number): ConfidenceLevel {
    if (totalAnswered >= this.confHighThreshold) return ConfidenceLevel.HIGH;
    if (totalAnswered >= this.confMediumThreshold)
      return ConfidenceLevel.MEDIUM;
    if (totalAnswered >= this.minAttemptsThreshold) return ConfidenceLevel.LOW;
    return ConfidenceLevel.VERY_LOW;
  }
}
