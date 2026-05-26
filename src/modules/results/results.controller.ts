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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { ResultsService } from './results.service';
import { UseAuth } from '@common/decorators/use-auth.decorator';
import { GetCurrentUser } from '@common/decorators/get-current-user.decorator';
import type { RequestUser } from '@modules/auth/interfaces/jwt-payload.interface';
import { CompareUsersDto } from './dto/compare-users.dto';

@ApiTags('Results')
@ApiBearerAuth()
@UseAuth()
@Controller('results')
export class ResultsController {
  constructor(private readonly resultsService: ResultsService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách kết quả (Admin: tất cả, User: của mình)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Giới hạn số lượng kết quả', type: Number })
  @ApiResponse({ status: 200, description: 'Danh sách kết quả thành công' })
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
      results = await this.resultsService.listResultByUser(user.userId, parsedLimit);
    }
    return { results, total: results.length };
  }

  @Get('knowledge/analysis')
  @ApiOperation({ summary: 'Phân tích điểm yếu kiến thức của người dùng hiện tại' })
  @ApiQuery({ name: 'knowledgeType', required: true, description: 'Loại kiến thức cần phân tích' })
  @ApiQuery({ name: 'subjectId', required: false, description: 'ID của môn học (tùy chọn)' })
  @ApiResponse({ status: 200, description: 'Phân tích kiến thức thành công' })
  @ApiResponse({ status: 400, description: 'Thiếu tham số knowledgeType' })
  async analyzeKnowledgeWeakness(
    @GetCurrentUser() user: RequestUser,
    @Query('knowledgeType') knowledgeType: string,
    @Query('subjectId') subjectId?: string,
  ) {
    if (!knowledgeType) {
      throw new BadRequestException('Tham số knowledgeType là bắt buộc');
    }
    return await this.resultsService.analyzeKnowledgeWeakness(user.userId, knowledgeType, subjectId);
  }

  @Get('analytics/leaderboard')
  @ApiOperation({ summary: 'Lấy bảng xếp hạng' })
  @ApiQuery({ name: 'examId', required: false, description: 'ID của đề thi', type: Number })
  @ApiQuery({ name: 'subjectId', required: false, description: 'ID của môn học' })
  @ApiQuery({ name: 'limit', required: false, description: 'Số lượng top (mặc định: 10)', type: Number })
  @ApiResponse({ status: 200, description: 'Bảng xếp hạng thành công' })
  async getLeaderboard(
    @Query('examId') examId?: string,
    @Query('subjectId') subjectId?: string,
    @Query('limit') limit?: string,
  ) {
    const parsedExamId = examId ? parseInt(examId, 10) : undefined;
    const parsedLimit = limit ? parseInt(limit, 10) : 10;
    const leaderboard = await this.resultsService.getLeaderboard(parsedExamId, subjectId, parsedLimit);
    return { success: true, leaderboard };
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Lấy danh sách kết quả của một người dùng' })
  @ApiParam({ name: 'userId', description: 'ID của người dùng', type: Number })
  @ApiQuery({ name: 'subjectId', required: false, description: 'Lọc theo môn học' })
  @ApiQuery({ name: 'limit', required: false, description: 'Giới hạn số lượng', type: Number })
  @ApiResponse({ status: 200, description: 'Danh sách kết quả thành công' })
  async getUserResults(
    @Param('userId', ParseIntPipe) targetUserId: number,
    @Query('subjectId') subjectId?: string,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = limit ? parseInt(limit, 10) : undefined;
    const results = await this.resultsService.getUserResults(targetUserId, subjectId, parsedLimit);
    return { success: true, results, total: results.length };
  }

  @Get('user/:userId/statistics')
  @ApiOperation({ summary: 'Lấy thống kê học tập của một người dùng' })
  @ApiParam({ name: 'userId', description: 'ID của người dùng', type: Number })
  @ApiResponse({ status: 200, description: 'Thống kê người dùng thành công' })
  async getUserStatistics(@Param('userId', ParseIntPipe) targetUserId: number) {
    const statistics = await this.resultsService.getUserStatistics(targetUserId);
    return { success: true, statistics };
  }

  @Get('user/:userId/skill-performance')
  @ApiOperation({ summary: 'Lấy hiệu suất theo kỹ năng của người dùng' })
  @ApiParam({ name: 'userId', description: 'ID của người dùng', type: Number })
  @ApiResponse({ status: 200, description: 'Hiệu suất kỹ năng thành công' })
  async getSkillPerformance(@Param('userId', ParseIntPipe) targetUserId: number) {
    const skillPerformance = await this.resultsService.getSkillPerformance(targetUserId);
    return { success: true, skill_performance: skillPerformance };
  }

  @Get('user/:userId/performance-trend')
  @ApiOperation({ summary: 'Lấy xu hướng hiệu suất học tập của người dùng' })
  @ApiParam({ name: 'userId', description: 'ID của người dùng', type: Number })
  @ApiQuery({ name: 'days', required: false, description: 'Số ngày cần phân tích (mặc định: 30)', type: Number })
  @ApiResponse({ status: 200, description: 'Xu hướng hiệu suất thành công' })
  async getPerformanceTrend(
    @Param('userId', ParseIntPipe) targetUserId: number,
    @Query('days') days?: string,
  ) {
    const periodDays = days ? parseInt(days, 10) : 30;
    const trend = await this.resultsService.getPerformanceTrend(targetUserId, periodDays);
    return { success: true, trend, period_days: periodDays };
  }

  @Get('user/:userId/difficulty-analysis')
  @ApiOperation({ summary: 'Phân tích hiệu suất theo độ khó của người dùng' })
  @ApiParam({ name: 'userId', description: 'ID của người dùng', type: Number })
  @ApiResponse({ status: 200, description: 'Phân tích độ khó thành công' })
  async getDifficultyAnalysis(@Param('userId', ParseIntPipe) targetUserId: number) {
    const difficultyAnalysis = await this.resultsService.getDifficultyAnalysis(targetUserId);
    return { success: true, difficulty_analysis: difficultyAnalysis };
  }

  @Get('exam/:examId')
  @UseAuth('Admin')
  @ApiOperation({ summary: 'Lấy danh sách kết quả của một đề thi (Admin)' })
  @ApiParam({ name: 'examId', description: 'ID của đề thi', type: Number })
  @ApiQuery({ name: 'limit', required: false, description: 'Giới hạn số lượng', type: Number })
  @ApiResponse({ status: 200, description: 'Danh sách kết quả đề thi thành công' })
  @ApiResponse({ status: 403, description: 'Không có quyền truy cập' })
  async getExamResults(
    @Param('examId', ParseIntPipe) examId: number,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = limit ? parseInt(limit, 10) : undefined;
    const results = await this.resultsService.getExamResults(examId, parsedLimit);
    return { success: true, results, total: results.length };
  }

  @Get('exam/:examId/statistics')
  @ApiOperation({ summary: 'Lấy thống kê của một đề thi' })
  @ApiParam({ name: 'examId', description: 'ID của đề thi', type: Number })
  @ApiResponse({ status: 200, description: 'Thống kê đề thi thành công' })
  async getExamStatistics(@Param('examId', ParseIntPipe) examId: number) {
    const statistics = await this.resultsService.getExamStatistics(examId);
    return { success: true, statistics };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy thông tin một kết quả' })
  @ApiParam({ name: 'id', description: 'ID của kết quả', type: Number })
  @ApiResponse({ status: 200, description: 'Kết quả thi thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy kết quả' })
  async getResult(@Param('id', ParseIntPipe) resultId: number) {
    const result = await this.resultsService.getResultById(resultId);
    if (!result) throw new NotFoundException('Kết quả không tồn tại');
    return { success: true, result };
  }

  @Get(':id/details')
  @ApiOperation({ summary: 'Lấy chi tiết kết quả kèm đáp án' })
  @ApiParam({ name: 'id', description: 'ID của kết quả', type: Number })
  @ApiResponse({ status: 200, description: 'Chi tiết kết quả thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy kết quả' })
  async getResultDetails(@Param('id', ParseIntPipe) resultId: number) {
    const resultDetails = await this.resultsService.getResultDetailsWithAnswers(resultId);
    if (!resultDetails) throw new NotFoundException('Kết quả không tồn tại');
    return resultDetails;
  }

  @Get(':id/analysis')
  @ApiOperation({ summary: 'Phân tích chi tiết một bài làm' })
  @ApiParam({ name: 'id', description: 'ID của kết quả', type: Number })
  @ApiResponse({ status: 200, description: 'Phân tích bài làm thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy bài làm' })
  async getResultAnalysis(@Param('id', ParseIntPipe) resultId: number) {
    const data = await this.resultsService.getResultAnalysis(resultId);
    if (!data) throw new NotFoundException('Không tìm thấy bài làm');
    return data;
  }

  @Post('compare')
  @UseAuth('Admin')
  @ApiOperation({ summary: 'So sánh kết quả giữa nhiều người dùng (Admin)' })
  @ApiResponse({ status: 201, description: 'So sánh người dùng thành công' })
  @ApiResponse({ status: 403, description: 'Không có quyền truy cập' })
  async compareUsers(@Body() compareUsersDto: CompareUsersDto) {
    const comparison = await this.resultsService.compareUsers(compareUsersDto.userIds);
    return { success: true, comparison };
  }

  @Delete(':id')
  @UseAuth('Admin')
  @ApiOperation({ summary: 'Xóa một kết quả thi (Admin)' })
  @ApiParam({ name: 'id', description: 'ID của kết quả cần xóa', type: Number })
  @ApiResponse({ status: 200, description: 'Xóa kết quả thành công' })
  @ApiResponse({ status: 403, description: 'Không có quyền truy cập' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy kết quả' })
  async deleteResult(@Param('id', ParseIntPipe) resultId: number) {
    await this.resultsService.deleteResult(resultId);
    return { success: true, message: 'Xóa kết quả thành công' };
  }
}
