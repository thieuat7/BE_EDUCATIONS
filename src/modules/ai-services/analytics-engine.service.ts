import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

// --- 1. Lớp Cấu hình ---

export class AICommentaryConfig {
  // Ngưỡng chung
  MIN_COUNT_FOR_RELIABLE_ANALYSIS = 1; // Số câu sai tối thiểu để kích hoạt luật

  // Ngưỡng %
  PERCENT_CRITICAL_SINGLE_SKILL = 70.0; // % để coi là "Lỗ hổng duy nhất"
  PERCENT_MAJOR_SKILL = 40.0; // % để coi là kỹ năng yếu "chính"
  PERCENT_SIGNIFICANT_SKILL = 30.0; // % để coi là kỹ năng yếu "đáng kể"
  PERCENT_DUAL_WEAKNESS = 25.0; // % cho mỗi kỹ năng trong "Yếu điểm kép"
  PERCENT_SUM_DUAL_WEAKNESS = 50.0; // % tổng của "Yếu điểm kép"
  PERCENT_CONCEPT_IN_DIFFICULTY_1 = 50.0; // % cho "Khái niệm trong Dễ" (Luật 1 & 4)

  PERCENT_MAJORITY_DIFFICULTY = 50.0; // % để coi là "đa số" lỗi sai (Dễ, Khó)
  PERCENT_SIGNIFICANT_DIFFICULTY = 25.0; // % để coi là "đáng kể" (cho Luật 1)
  PERCENT_HIGH_DIFFICULTY = 60.0; // % cho "Thử thách vận dụng cao"
  PERCENT_MID_DIFFICULTY = 60.0; // % cho "Sai nhiều câu Trung bình"

  // Time & overall-failure thresholds
  TIME_TOO_FAST_SECONDS_PER_Q = 3.0; // trung bình < 3s/câu => có khả năng quá vội
  MIN_QUESTIONS_FOR_TIME_ANALYSIS = 3; // chỉ áp dụng phân tích thời gian nếu đủ câu
  TOTAL_INCORRECT_RELEARN_RATIO = 0.6; // nếu sai >= 60% tổng số câu => cần học lại toàn bộ
}

// --- 2. Lớp Context ---

export class AnalysisContext {
  totalIncorrect: number;

  skill1Name: string;
  skill1Count: number;
  skill2Name: string;
  skill2Count: number;

  knowledge1Name: string;
  knowledge1Type: string;
  knowledge1Count: number;

  difficulty1Type: string;
  difficulty1Count: number;

  totalQuestions: number;
  totalTimeSeconds: number;
  avgTimePerQuestion: number | null;

  percentSkill1: number;
  percentSkill2: number;
  percentDifficulty1: number;

  countEasyAndConcept: number;
  percentConceptInDifficulty1: number;

  constructor(summaryData: any) {
    this.totalIncorrect = parseInt(summaryData.totalIncorrect) || 0;

    const skillWeakness = summaryData.weaknessBySkill || [];
    const knowledgeWeakness = summaryData.weaknessByKnowledge || [];
    const difficultyWeakness = summaryData.weaknessByDifficulty || [];

    const topSkill1 = skillWeakness[0] || {};
    const topSkill2 = skillWeakness[1] || {};
    const topKnowledge1 = knowledgeWeakness[0] || {};
    const topDifficulty1 = difficultyWeakness[0] || {};

    this.skill1Name = topSkill1.skillName || 'Không rõ';
    this.skill1Count = parseInt(topSkill1.count) || 0;
    this.skill2Name = topSkill2.skillName || 'Không rõ';
    this.skill2Count = parseInt(topSkill2.count) || 0;

    this.knowledge1Name = topKnowledge1.name || 'Không rõ';
    this.knowledge1Type = topKnowledge1.type || 'Unknown';
    this.knowledge1Count = parseInt(topKnowledge1.count) || 0;

    this.difficulty1Type = topDifficulty1.type || 'Unknown';
    this.difficulty1Count = parseInt(topDifficulty1.count) || 0;

    // Time-related safe extraction
    this.totalQuestions = parseInt(summaryData.totalQuestions) || 0;
    this.totalTimeSeconds = parseFloat(summaryData.timeTaken) || 0.0;

    const avgTimeProvided = summaryData.averageTimePerQuestion;
    if (avgTimeProvided !== undefined && avgTimeProvided !== null) {
      this.avgTimePerQuestion = parseFloat(avgTimeProvided) || null;
    } else {
      if (this.totalQuestions > 0) {
        this.avgTimePerQuestion = this.totalTimeSeconds / this.totalQuestions;
      } else {
        this.avgTimePerQuestion = null;
      }
    }

    // Tính toán an toàn
    if (this.totalIncorrect > 0) {
      this.percentSkill1 = (this.skill1Count / this.totalIncorrect) * 100;
      this.percentSkill2 = (this.skill2Count / this.totalIncorrect) * 100;
      this.percentDifficulty1 =
        (this.difficulty1Count / this.totalIncorrect) * 100;
    } else {
      this.percentSkill1 = 0.0;
      this.percentSkill2 = 0.0;
      this.percentDifficulty1 = 0.0;
    }

    this.countEasyAndConcept =
      parseInt(summaryData.count_easy_and_concept) ||
      parseInt(summaryData.easyConceptMistakes) ||
      0;

    if (this.difficulty1Count > 0) {
      this.percentConceptInDifficulty1 =
        (this.countEasyAndConcept / this.difficulty1Count) * 100;
    } else {
      this.percentConceptInDifficulty1 = 0.0;
    }
  }
}

// --- 3. Lớp Analytics chính ---

export interface AnalysisResult {
  messages: string[];
  key_highlights: string[];
  persona: string;
  status: string;
}

@Injectable()
export class AnalyticsEngineService {
  private config: AICommentaryConfig;
  private readonly logger = new Logger(AnalyticsEngineService.name);

  constructor(private configService: ConfigService) {
    this.config = new AICommentaryConfig();
  }

  private getKnowledgeTypeText(kType: string): string {
    if (kType === 'KhaiNiem') return 'phần lý thuyết/khái niệm';
    if (kType === 'DangBaiTap') return 'các dạng bài tập';
    return 'phần';
  }

  // --- Các hàm Luật ---

  private ruleFundamentalGap(ctx: AnalysisContext): [string, string[]] | null {
    const percentConceptInEasy = ctx.percentConceptInDifficulty1;

    const isTopErrorEasy = ctx.difficulty1Type === 'De';
    const isTopKnowledgeConcept = ctx.knowledge1Type === 'KhaiNiem';
    const isConceptMajorityInEasy =
      percentConceptInEasy > this.config.PERCENT_MAJORITY_DIFFICULTY;
    const isDataReliable =
      ctx.difficulty1Count > this.config.MIN_COUNT_FOR_RELIABLE_ANALYSIS;
    const isEasyErrorSignificant =
      ctx.percentDifficulty1 > this.config.PERCENT_SIGNIFICANT_DIFFICULTY;

    if (
      isTopErrorEasy &&
      isTopKnowledgeConcept &&
      isConceptMajorityInEasy &&
      isDataReliable &&
      isEasyErrorSignificant
    ) {
      const text = `‼️ **Điểm cần lưu ý nhất là về kiến thức nền.** Dữ liệu cho thấy bạn sai **${ctx.difficulty1Count} câu 'Dễ'**, trong đó có tới **${percentConceptInEasy.toFixed(0)}%** là các lỗi thuộc về **'${ctx.knowledge1Name}'**. Điều này cho thấy bạn đang **bị hổng một phần kiến thức cơ bản**. Lời khuyên là hãy **dừng lại và ôn tập kỹ** phần lý thuyết này trước khi luyện các dạng nâng cao, vì 'gốc' chưa vững thì rất khó để xây 'ngọn'.`;
      return [
        text,
        [
          `difficulty:${ctx.difficulty1Type}`,
          `knowledge:${ctx.knowledge1Name}`,
        ],
      ];
    }
    return null;
  }

  private ruleTheoryWeakness(ctx: AnalysisContext): [string, string[]] | null {
    if (
      ctx.percentSkill1 > this.config.PERCENT_SIGNIFICANT_SKILL &&
      ctx.knowledge1Type === 'KhaiNiem' &&
      ctx.knowledge1Count >= ctx.skill1Count * 0.5
    ) {
      const text = `⚠️ **Vấn đề về lý thuyết:** Phân tích cho thấy điểm yếu của bạn nằm ở phần lý thuyết của kỹ năng **'${ctx.skill1Name}'**. Cụ thể, trong số các câu sai về kỹ năng này, có tới **${ctx.knowledge1Count} câu** liên quan đến **'${ctx.knowledge1Name}'**. Điều này cho thấy bạn có thể **hiểu bài một cách 'lơ mơ'**, nắm được cách làm bài tập nhưng lại quên định nghĩa hoặc tính chất cơ bản. Hãy thử **hệ thống lại lý thuyết** của kỹ năng này, có thể bằng cách vẽ sơ đồ tư duy hoặc tự tay ghi lại các công thức/định nghĩa chính.`;
      return [
        text,
        [`skill:${ctx.skill1Name}`, `knowledge:${ctx.knowledge1Name}`],
      ];
    }
    return null;
  }

  private rulePracticeWeakness(
    ctx: AnalysisContext,
  ): [string, string[]] | null {
    if (
      ctx.percentSkill1 > this.config.PERCENT_MAJOR_SKILL &&
      ctx.knowledge1Type === 'DangBaiTap' &&
      ctx.knowledge1Count >= ctx.skill1Count * 0.5
    ) {
      const text = `⚠️ **Điểm yếu về thực hành:** Một điểm yếu rõ rệt là kỹ năng **'${ctx.skill1Name}'**, đặc biệt ở **'${ctx.knowledge1Name}'** (chiếm ${ctx.knowledge1Count} câu sai). Khác với lỗi lý thuyết, ở đây có vẻ bạn đã **nắm được định nghĩa nhưng lại lúng túng khi áp dụng vào bài tập**. Bạn có thể nhận ra dạng bài, nhưng lại chưa luyện tập đủ để xử lý thành thạo hoặc chưa nhận diện được 'bẫy' của đề. Cách cải thiện tốt nhất là **tìm thêm các bài tập** về dạng này và luyện tập cho thật quen tay.`;
      return [
        text,
        [`skill:${ctx.skill1Name}`, `knowledge:${ctx.knowledge1Name}`],
      ];
    }
    return null;
  }

  private ruleCarelessStudent(ctx: AnalysisContext): [string, string[]] | null {
    const percentConceptInEasy = ctx.percentConceptInDifficulty1;

    const isTopErrorEasy = ctx.difficulty1Type === 'De';
    const isEasyErrorSignificant =
      ctx.percentDifficulty1 > this.config.PERCENT_SIGNIFICANT_DIFFICULTY;
    const isConceptNotMajorityInEasy =
      percentConceptInEasy <= this.config.PERCENT_CONCEPT_IN_DIFFICULTY_1;
    const isDataReliable =
      ctx.difficulty1Count > this.config.MIN_COUNT_FOR_RELIABLE_ANALYSIS;

    if (
      isTopErrorEasy &&
      isEasyErrorSignificant &&
      isConceptNotMajorityInEasy &&
      isDataReliable
    ) {
      let errorTypeName = 'lỗi thực thi (như tính toán, đọc đề)';
      if (ctx.knowledge1Type !== 'KhaiNiem') {
        errorTypeName = `lỗi áp dụng '${ctx.knowledge1Name}'`;
      }
      const text = `‼️ **Đây là điểm đáng tiếc nhất!** Dữ liệu cho thấy bạn sai tới **${ctx.difficulty1Count} câu ở mức 'Dễ'**. Các lỗi này chủ yếu *không* phải do hổng kiến thức 'Khái niệm' (chỉ chiếm **${percentConceptInEasy.toFixed(0)}%**), mà dường như là do **cẩu thả trong quá trình làm bài**. Cụ thể là các ${errorTypeName}, đọc đề không kỹ, hoặc vội vàng khi chọn đáp án. Đây là những điểm số 'của mình' mà lại bị mất. Hãy rèn luyện **tính cẩn thận**, đọc lại câu hỏi hai lần và luôn kiểm tra lại kết quả trước khi nộp bài.`;
      return [
        text,
        [
          `difficulty:${ctx.difficulty1Type}`,
          `knowledge:${ctx.knowledge1Name}`,
        ],
      ];
    }
    return null;
  }

  private ruleHighDifficultyChallenge(
    ctx: AnalysisContext,
  ): [string, string[]] | null {
    if (
      ctx.difficulty1Type === 'Kho' &&
      ctx.percentDifficulty1 > this.config.PERCENT_HIGH_DIFFICULTY &&
      ctx.knowledge1Type === 'DangBaiTap'
    ) {
      const text = `🎯 **Thử thách ở mức vận dụng cao:** Kết quả của bạn rất tốt. Hầu hết các lỗi sai (${ctx.difficulty1Count} câu, chiếm ${ctx.percentDifficulty1.toFixed(0)}%) đều tập trung ở mức **'Khó'**, chủ yếu ở **'${ctx.knowledge1Name}'**. Điều này cho thấy bạn đã **nắm rất vững kiến thức nền tảng và cơ bản**. Việc sai ở các câu này là bình thường và là dấu hiệu bạn đang ở nhóm học sinh khá/giỏi. Để chinh phục điểm 9-10, hãy tập trung **phân tích các dạng bài khó** này, tìm hiểu các phương pháp giải đặc biệt hoặc các 'bẫy' thường gặp.`;
      return [
        text,
        [
          `difficulty:${ctx.difficulty1Type}`,
          `knowledge:${ctx.knowledge1Name}`,
        ],
      ];
    }
    return null;
  }

  private ruleTotalFailure(ctx: AnalysisContext): [string, string[]] | null {
    if (
      ctx.totalQuestions > 0 &&
      ctx.totalIncorrect / ctx.totalQuestions >=
        this.config.TOTAL_INCORRECT_RELEARN_RATIO &&
      ctx.totalQuestions >= this.config.MIN_QUESTIONS_FOR_TIME_ANALYSIS
    ) {
      const failurePercent = (ctx.totalIncorrect / ctx.totalQuestions) * 100;
      const text = `‼️ **Cảnh báo nghiêm trọng:** Bạn đã sai tới **${ctx.totalIncorrect}/${ctx.totalQuestions}** câu (chiếm ${failurePercent.toFixed(0)}%). Đây là dấu hiệu cho thấy bạn đang bị **hổng kiến thức rất nặng** ở chủ đề này. Kết quả này chưa phản ánh đúng năng lực của bạn. Lời khuyên là hãy **dừng lại và học lại từ đầu** toàn bộ lý thuyết cơ bản trước khi tiếp tục luyện đề.`;
      return [text, ['status:needs_relearn']];
    }
    return null;
  }

  private ruleTimeBehavior(ctx: AnalysisContext): [string, string[]] | null {
    if (
      ctx.avgTimePerQuestion === null ||
      ctx.totalQuestions < this.config.MIN_QUESTIONS_FOR_TIME_ANALYSIS
    ) {
      return null;
    }

    if (ctx.avgTimePerQuestion < this.config.TIME_TOO_FAST_SECONDS_PER_Q) {
      const avgTime = ctx.avgTimePerQuestion;
      if (
        ctx.knowledge1Type === 'KhaiNiem' &&
        ctx.knowledge1Count > ctx.totalIncorrect * 0.3
      ) {
        const text = `⚠️ **Cảnh báo về tốc độ:** Bạn làm bài quá nhanh (trung bình ${avgTime.toFixed(1)} giây/câu) và đồng thời **sai nhiều về lý thuyết/khái niệm** ('${ctx.knowledge1Name}'). Đây là dấu hiệu của việc **làm ẩu, đọc đề không kỹ** và 'lướt' qua các câu hỏi. Hãy chậm lại, đọc kỹ từng chữ, đặc biệt là các câu hỏi lý thuyết.`;
        return [text, ['behavior:too_fast', `knowledge:${ctx.knowledge1Name}`]];
      } else {
        const text = `⚠️ **Cảnh báo về tốc độ:** Thời gian làm bài của bạn **cực kỳ nhanh** (trung bình chỉ ${avgTime.toFixed(1)} giây/câu). Rất có thể bạn đã **không thực sự nghiêm túc làm bài** (chọn bừa, click cho qua). Kết quả phân tích này sẽ không chính xác. Hãy làm lại bài với thái độ tập trung hơn để có kết quả thực tế nhất.`;
        return [text, ['behavior:too_fast', 'status:not_serious']];
      }
    }
    return null;
  }

  private ruleSkillAnalysis(ctx: AnalysisContext): [string, string[]] | null {
    if (
      ctx.percentSkill1 > this.config.PERCENT_DUAL_WEAKNESS &&
      ctx.percentSkill1 < this.config.PERCENT_CRITICAL_SINGLE_SKILL &&
      ctx.percentSkill2 > this.config.PERCENT_DUAL_WEAKNESS &&
      ctx.percentSkill1 + ctx.percentSkill2 >
        this.config.PERCENT_SUM_DUAL_WEAKNESS
    ) {
      const text = `👉 Về chi tiết, lỗi sai của bạn không tập trung ở một điểm mà **phân bổ vào hai mảng chính**: **'${ctx.skill1Name}'** (chiếm ${ctx.percentSkill1.toFixed(0)}%) và **'${ctx.skill2Name}'** (chiếm ${ctx.percentSkill2.toFixed(0)}%). Điều này có nghĩa là bạn sẽ cần **phân bổ thời gian ôn tập cho cả hai** mảng này, thay vì chỉ tập trung vào một.`;
      return [text, [`skill:${ctx.skill1Name}`, `skill:${ctx.skill2Name}`]];
    } else if (ctx.percentSkill1 > this.config.PERCENT_CRITICAL_SINGLE_SKILL) {
      const text = `👉 Vấn đề của bạn **rất rõ ràng và tập trung**: Gần **${ctx.percentSkill1.toFixed(0)}%** số lỗi sai (${ctx.skill1Count} câu) đều thuộc về một kỹ năng duy nhất là **'${ctx.skill1Name}'**. Đây chính là 'lỗ hổng' lớn nhất cần vá. Nếu bạn cải thiện được kỹ năng này, điểm số sẽ tăng lên rất nhanh.`;
      return [text, [`skill:${ctx.skill1Name}`]];
    } else if (ctx.percentSkill1 > this.config.PERCENT_SIGNIFICANT_SKILL) {
      let baseText = `👉 Điểm yếu lớn nhất của bạn là kỹ năng **'${ctx.skill1Name}'** (chiếm ${ctx.percentSkill1.toFixed(0)}% tổng số lỗi sai). Đây là mảng kiến thức bạn cần xem lại đầu tiên.`;
      const highlights = [`skill:${ctx.skill1Name}`];
      if (ctx.skill2Count > this.config.MIN_COUNT_FOR_RELIABLE_ANALYSIS) {
        baseText += ` Ngoài ra, hãy xem lại kỹ năng **'${ctx.skill2Name}'** (sai ${ctx.skill2Count} câu).`;
        highlights.push(`skill:${ctx.skill2Name}`);
      }
      return [baseText, highlights];
    } else if (ctx.skill1Count > 0) {
      const text = `👉 Lỗi sai của bạn khá **dàn trải** trên nhiều kỹ năng, không có điểm yếu nào thực sự nổi bật. Kỹ năng cần chú ý nhất là **'${ctx.skill1Name}'** (sai ${ctx.skill1Count} câu), nhưng nó không chiếm đa số. Điều này có nghĩa là bạn cần **ôn tập tổng quan** lại nhiều chủ đề, rà soát lại các lỗi sai nhỏ lẻ.`;
      return [text, [`skill:${ctx.skill1Name}`]];
    }
    return null;
  }

  private ruleKnowledgeAnalysis(
    ctx: AnalysisContext,
  ): [string, string[]] | null {
    if (ctx.knowledge1Count > 0) {
      const kTypeText = this.getKnowledgeTypeText(ctx.knowledge1Type);
      const text = `🔎 Phân tích sâu hơn, các lỗi sai của bạn chủ yếu nằm ở **${kTypeText}** mang tên **'${ctx.knowledge1Name}'** (${ctx.knowledge1Count} câu). Hãy kiểm tra lại các bài tập thuộc dạng này.`;
      return [text, [`knowledge:${ctx.knowledge1Name}`]];
    }
    return null;
  }

  private ruleDifficultyAnalysis(
    ctx: AnalysisContext,
  ): [string, string[]] | null {
    if (
      ctx.difficulty1Type === 'De' &&
      ctx.percentDifficulty1 > this.config.PERCENT_MAJORITY_DIFFICULTY
    ) {
      const text = `‼️ **Điều đáng báo động:** Hơn một nửa số lỗi sai của bạn (${ctx.percentDifficulty1.toFixed(0)}%) là ở mức **'Dễ'**. Đây là dấu hiệu của việc mất điểm rất đáng tiếc, có thể do chủ quan hoặc hổng kiến thức căn bản nghiêm trọng.`;
      return [text, [`difficulty:${ctx.difficulty1Type}`]];
    } else if (
      ctx.difficulty1Type === 'Kho' &&
      ctx.percentDifficulty1 > this.config.PERCENT_MAJORITY_DIFFICULTY
    ) {
      const text = `🎯 Đa số câu sai (${ctx.percentDifficulty1.toFixed(0)}%) đều ở mức **'Khó'**. Điều này cho thấy bạn đã làm chủ được các câu dễ và trung bình. Đây là lúc tập trung vào các câu vận dụng cao.`;
      return [text, [`difficulty:${ctx.difficulty1Type}`]];
    } else if (
      ctx.difficulty1Type === 'TrungBinh' &&
      ctx.percentDifficulty1 > this.config.PERCENT_MID_DIFFICULTY
    ) {
      const text = `🔎 Các lỗi sai chủ yếu tập trung ở mức **'Trung bình'** (${ctx.percentDifficulty1.toFixed(0)}%). Đây là 'phần thân' của bài thi, cho thấy bạn cần **luyện tập thêm** để thành thạo các dạng bài phổ biến, tránh bị mất điểm ở phần này.`;
      return [text, [`difficulty:${ctx.difficulty1Type}`]];
    }
    return null;
  }

  private generateFinalSuggestion(
    ctx: AnalysisContext,
    persona: string,
    hasCombinedAnalysis: boolean,
  ): string {
    let suggestion = '\n**Gợi ý cải thiện:**\n';

    if (persona === 'fundamentalGap') {
      suggestion += `Ưu tiên số 1 của bạn là **vá lại lỗ hổng kiến thức nền**. Hãy tạm dừng luyện đề khó, tập trung ôn lại lý thuyết và bài tập cơ bản của **'${ctx.knowledge1Name}'** và **'${ctx.skill1Name}'**.`;
    } else if (persona === 'carelessStudent') {
      suggestion += `Ưu tiên số 1 của bạn là **rèn luyện tính cẩn thận**. Lỗi sai ở câu 'Dễ' là lỗi đáng tiếc nhất. Hãy tập thói quen **đọc kỹ đề 2 lần** và **kiểm tra lại (re-check)** bài làm trước khi nộp.`;
    } else if (persona === 'theoryWeakness') {
      suggestion += `Ưu tiên số 1 là **hệ thống lại lý thuyết** của kỹ năng **'${ctx.skill1Name}'**. Bạn cần đảm bảo mình 'hiểu sâu' chứ không chỉ 'nhớ mang máng' các định nghĩa, tính chất.`;
    } else if (persona === 'practiceWeakness') {
      suggestion += `Ưu tiên số 1 là **luyện tập thêm** về kỹ năng **'${ctx.skill1Name}'**, đặc biệt là **'${ctx.knowledge1Name}'**. Bạn hiểu lý thuyết nhưng chưa đủ 'thành thạo'. Hãy làm thêm bài tập để tăng tốc độ và độ chính xác.`;
    } else if (persona === 'highDifficultyChallenge') {
      suggestion += `Bạn đã làm rất tốt! Bước tiếp theo là **chinh phục các câu vận dụng cao**. Hãy tìm các dạng bài khó, các 'câu bẫy' của **'${ctx.knowledge1Name}'** để luyện tập và đạt điểm tối đa.`;
    } else if (persona === 'needsRelearn' || persona === 'totalFailure') {
      suggestion +=
        'Mức sai hiện tại cho thấy bạn chưa có nền tảng đủ để làm đề. Hãy quay lại chương trình học cơ bản, hệ thống lại kiến thức theo từng chủ đề, làm theo lộ trình từ dễ đến khó, và sau đó mới bắt đầu luyện đề theo thời gian quy định.';
    } else if (persona === 'ruleTimeBehavior' || persona.includes('too_fast')) {
      suggestion +=
        "Bạn làm quá nhanh dẫn đến mất điểm đáng tiếc. Thực hành kỹ năng đọc đề và kiểm tra lại bài, tập thói quen 're-check' trước khi nộp. Làm bài mẫu chậm lại để thiết lập nhịp làm phù hợp.";
    } else if (!hasCombinedAnalysis) {
      if (ctx.percentSkill1 > this.config.PERCENT_MAJOR_SKILL) {
        suggestion += `Lỗi sai của bạn khá tập trung vào **'${ctx.skill1Name}'**. Hãy bắt đầu bằng cách ôn tập lại cả lý thuyết và bài tập của kỹ năng này.`;
      } else {
        suggestion += `Lỗi sai của bạn khá dàn trải. Hãy xem lại các kỹ năng được chỉ ra ở trên, bắt đầu từ **'${ctx.skill1Name}'** và **'${ctx.skill2Name}'** để cải thiện dần dần.`;
      }
    } else {
      suggestion +=
        'Hãy ưu tiên xem lại các nội dung được **in đậm** ở trên và các kỹ năng được chỉ ra để cải thiện điểm số nhanh nhất.';
    }

    return suggestion;
  }

  private async rewriteFeedbackWithAi(
    rawMessages: string[],
  ): Promise<string[]> {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      this.logger.warn(
        '⚠️ CHƯA CÓ API KEY GEMINI. HỆ THỐNG SẼ KHÔNG VIẾT LẠI VĂN BẢN.',
      );
      return rawMessages;
    }

    const inputText = rawMessages.join('\n');
    const prompt = `Dưới đây là dữ liệu phân tích lỗi sai của học sinh từ hệ thống logic:
---
${inputText}
---
NHIỆM VỤ:
Viết lại nội dung trên thành một đoạn nhận xét ngắn (khoảng 100-120 từ) từ một giáo viên AI ân cần nhưng nghiêm khắc.

YÊU CẦU BẮT BUỘC:
1. **Trung thực tuyệt đối**: Chỉ dựa vào dữ liệu ở trên. KHÔNG được tự bịa ra kiến thức, số liệu hay tên bài học không có trong dữ liệu.
2. **Cấu trúc**: 
   - Câu 1: Khen ngợi hoặc động viên dựa trên thực tế.
   - Câu 2-3: Chỉ ra vấn đề cốt lõi (dùng từ ngữ nhẹ nhàng hơn "lỗi sai").
   - Câu 4: Lời khuyên hành động cụ thể.
3. **Định dạng**: Giữ nguyên các từ khóa được in đậm (bọc trong **...**) trong văn bản gốc để nhấn mạnh.
4. **Giọng văn**: Cá nhân hóa, dùng từ "bạn", tránh dùng "hệ thống nhận thấy".`;

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      const result = await model.generateContent(prompt);
      console.log('AI rewrite result:', result);
      return [result.response.text()];
    } catch (error) {
      this.logger.error(`⚠️ Lỗi gọi AI rewrite: ${error.message}`);
      return rawMessages;
    }
  }

  public async generateAiCommentary(summaryData: any): Promise<AnalysisResult> {
    const ctx = new AnalysisContext(summaryData);

    if (ctx.totalIncorrect === 0) {
      return {
        messages: [
          'Xuất sắc! Bạn đã làm đúng tất cả các câu. Hãy tiếp tục phát huy.',
        ],
        key_highlights: [],
        persona: 'perfect',
        status: 'perfect',
      };
    }

    if (ctx.totalIncorrect >= 1 && ctx.totalIncorrect <= 2) {
      const messages = [
        `Kết quả rất tốt! Bạn chỉ sai tổng cộng ${ctx.totalIncorrect} câu.`,
      ];
      const highlights: string[] = []; // ✅ Đã sửa: thêm type string[]

      if (ctx.skill1Count > 0) {
        messages.push(
          `👉 Lỗi sai nhỏ này nằm ở kỹ năng **'${ctx.skill1Name}'** (câu hỏi mức **${ctx.difficulty1Type.toLowerCase()}**). Hãy xem lướt lại một chút là được. Nhìn chung bạn đã nắm bài rất chắc.`,
        );
        highlights.push(`skill:${ctx.skill1Name}`);
        highlights.push(`difficulty:${ctx.difficulty1Type}`);
      } else if (ctx.difficulty1Count > 0) {
        messages.push(
          `👉 Lỗi sai của bạn là một câu ở mức **${ctx.difficulty1Type.toLowerCase()}**. Hãy xem lướt lại một chút nhé. Nhìn chung bạn đã nắm bài rất chắc.`,
        );
        highlights.push(`difficulty:${ctx.difficulty1Type}`);
      }

      return {
        messages,
        key_highlights: Array.from(new Set(highlights)),
        persona: 'minor_errors',
        status: 'imperfect',
      };
    }

    const messages = [
      `Bạn đã sai tổng cộng ${ctx.totalIncorrect} câu. Hãy cùng xem xét các điểm yếu:`,
    ];
    const keyHighlights: string[] = []; // ✅ Đã sửa: thêm type string[]
    let persona = 'individual_analysis';
    let hasCombinedAnalysis = false;

    // Chạy các luật kết hợp (để lấy persona)
    const combinedRules = [
      { name: 'ruleTimeBehavior', rule: this.ruleTimeBehavior.bind(this) },
      { name: 'totalFailure', rule: this.ruleTotalFailure.bind(this) },
      { name: 'fundamentalGap', rule: this.ruleFundamentalGap.bind(this) },
      { name: 'carelessStudent', rule: this.ruleCarelessStudent.bind(this) },
      { name: 'theoryWeakness', rule: this.ruleTheoryWeakness.bind(this) },
      { name: 'practiceWeakness', rule: this.rulePracticeWeakness.bind(this) },
      {
        name: 'highDifficultyChallenge',
        rule: this.ruleHighDifficultyChallenge.bind(this),
      },
    ];

    for (const { name, rule } of combinedRules) {
      const result = rule(ctx);
      if (result) {
        const [text, highlights] = result;
        messages.push(text);
        keyHighlights.push(...highlights);
        persona = name;
        hasCombinedAnalysis = true;
        break;
      }
    }

    // Luôn chạy phân tích kỹ năng
    const skillResult = this.ruleSkillAnalysis(ctx);
    if (skillResult) {
      const [text, highlights] = skillResult;
      messages.push(text);
      keyHighlights.push(...highlights);
    }

    // Nếu không có persona kết hợp, chạy các luật đơn lẻ
    if (!hasCombinedAnalysis) {
      const knowledgeResult = this.ruleKnowledgeAnalysis(ctx);
      if (knowledgeResult && !skillResult) {
        const [text, highlights] = knowledgeResult;
        messages.push(text);
        keyHighlights.push(...highlights);
      }

      const difficultyResult = this.ruleDifficultyAnalysis(ctx);
      if (difficultyResult) {
        const [text, highlights] = difficultyResult;
        messages.push(text);
        keyHighlights.push(...highlights);
      }
    }

    // Thêm gợi ý cuối cùng
    const finalSuggestion = this.generateFinalSuggestion(
      ctx,
      persona,
      hasCombinedAnalysis,
    );
    messages.push(finalSuggestion);

    // =========================================================
    // GỌI AI ĐỂ "LÀM ĐẸP" TEXT (Đang bị comment lại theo file gốc)
    // =========================================================
    // let finalMessages = messages;
    // if (ctx.totalIncorrect > 0) {
    //   finalMessages = await this.rewriteFeedbackWithAi(messages);
    // }

    return {
      messages: messages, // Nếu muốn bật AI thì thay bằng finalMessages
      key_highlights: Array.from(new Set(keyHighlights)),
      persona,
      status: 'imperfect',
    };
  }
}
