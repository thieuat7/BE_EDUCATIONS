import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Body,
  NotFoundException,
  BadRequestException,
  ParseIntPipe,
} from '@nestjs/common';
import { ResultsService } from './results.service';
import { UseAuth } from '@common/decorators/use-auth.decorator';
import { GetCurrentUser } from '@common/decorators/get-current-user.decorator';
import type { RequestUser } from '@modules/auth/interfaces/jwt-payload.interface';
import { CompareUsersDto } from './dto/compare-users.dto';

@UseAuth()
@Controller('results')
export class ResultsController {
  constructor(private readonly resultsService: ResultsService) {}

  @Get()
  async listResults(
    @GetCurrentUser() user: RequestUser,
    @Query('limit') limit?: string,
  ) {
    const isAdmin = user.roles?.includes('Admin');
    const parsedLimit = limit ? parseInt(limit, 10) : undefined;

    let results;
    if (isAdmin) {
      results = await this.resultsService.listResults(parsedLimit);
    } else {
      results = await this.resultsService.listResultByUser(
        user.userId,
        parsedLimit,
      );
    }

    return { results, total: results.length };
  }

  @Get(':id')
  async getResult(@Param('id', ParseIntPipe) resultId: number) {
    const result = await this.resultsService.getResultById(resultId);
    if (!result) throw new NotFoundException('Kết quả không tồn tại');

    return { success: true, result };
  }

  @Get(':id/details')
  async getResultDetails(@Param('id', ParseIntPipe) resultId: number) {
    const resultDetails =
      await this.resultsService.getResultDetailsWithAnswers(resultId);
    if (!resultDetails) throw new NotFoundException('Kết quả không tồn tại');

    return resultDetails;
  }

  @Get('knowledge/analysis')
  async analyzeKnowledgeWeakness(
    @GetCurrentUser() user: RequestUser,
    @Query('knowledgeType') knowledgeType: string,
    @Query('subjectId') subjectId?: string,
  ) {
    if (!knowledgeType) {
      throw new BadRequestException('Tham số knowledgeType là bắt buộc');
    }

    const analysis = await this.resultsService.analyzeKnowledgeWeakness(
      user.userId,
      knowledgeType,
      subjectId,
    );
    return { success: true, analysis };
  }

  @Get('user/:userId')
  async getUserResults(
    @Param('userId', ParseIntPipe) targetUserId: number,
    @Query('subjectId') subjectId?: string,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = limit ? parseInt(limit, 10) : undefined;
    const results = await this.resultsService.getUserResults(
      targetUserId,
      subjectId,
      parsedLimit,
    );
    return { success: true, results, total: results.length };
  }

  @Get(':id/analysis')
  async getResultAnalysis(@Param('id', ParseIntPipe) resultId: number) {
    const data = await this.resultsService.getResultAnalysis(resultId);
    if (!data) throw new NotFoundException('Không tìm thấy bài làm');

    return { success: true, summary: data.summary };
  }

  @Get('exam/:examId')
  @UseAuth('Admin')
  async getExamResults(
    @Param('examId', ParseIntPipe) examId: number,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = limit ? parseInt(limit, 10) : undefined;
    const results = await this.resultsService.getExamResults(
      examId,
      parsedLimit,
    );
    return { success: true, results, total: results.length };
  }

  @Get('user/:userId/statistics')
  async getUserStatistics(@Param('userId', ParseIntPipe) targetUserId: number) {
    const statistics =
      await this.resultsService.getUserStatistics(targetUserId);
    return { success: true, statistics };
  }

  @Get('exam/:examId/statistics')
  async getExamStatistics(@Param('examId', ParseIntPipe) examId: number) {
    const statistics = await this.resultsService.getExamStatistics(examId);
    return { success: true, statistics };
  }

  @Get('user/:userId/skill-performance')
  async getSkillPerformance(
    @Param('userId', ParseIntPipe) targetUserId: number,
  ) {
    const skillPerformance =
      await this.resultsService.getSkillPerformance(targetUserId);
    return { success: true, skill_performance: skillPerformance };
  }

  @Get('user/:userId/performance-trend')
  async getPerformanceTrend(
    @Param('userId', ParseIntPipe) targetUserId: number,
    @Query('days') days?: string,
  ) {
    const periodDays = days ? parseInt(days, 10) : 30;
    const trend = await this.resultsService.getPerformanceTrend(
      targetUserId,
      periodDays,
    );
    return { success: true, trend, period_days: periodDays };
  }

  @Get('user/:userId/difficulty-analysis')
  async getDifficultyAnalysis(
    @Param('userId', ParseIntPipe) targetUserId: number,
  ) {
    const difficultyAnalysis =
      await this.resultsService.getDifficultyAnalysis(targetUserId);
    return { success: true, difficulty_analysis: difficultyAnalysis };
  }

  @Post('compare')
  @UseAuth('Admin')
  async compareUsers(@Body() compareUsersDto: CompareUsersDto) {
    const comparison = await this.resultsService.compareUsers(
      compareUsersDto.userIds,
    );
    return { success: true, comparison };
  }

  @Get('analytics/leaderboard')
  async getLeaderboard(
    @Query('examId') examId?: string,
    @Query('subjectId') subjectId?: string,
    @Query('limit') limit?: string,
  ) {
    const parsedExamId = examId ? parseInt(examId, 10) : undefined;
    const parsedLimit = limit ? parseInt(limit, 10) : 10;

    const leaderboard = await this.resultsService.getLeaderboard(
      parsedExamId,
      subjectId,
      parsedLimit,
    );
    return { success: true, leaderboard };
  }

  @Delete(':id')
  @UseAuth('Admin')
  async deleteResult(@Param('id', ParseIntPipe) resultId: number) {
    await this.resultsService.deleteResult(resultId);
    return { success: true, message: 'Xóa kết quả thành công' };
  }
}
