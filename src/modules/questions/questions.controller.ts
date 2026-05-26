import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { QuestionsService } from './questions.service';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';

@ApiTags('Questions')
@ApiBearerAuth()
@Controller('questions')
export class QuestionsController {
  constructor(private readonly questionsService: QuestionsService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách câu hỏi (phân trang)' })
  @ApiQuery({ name: 'page', required: false, description: 'Trang hiện tại (mặc định: 1)', type: Number })
  @ApiQuery({ name: 'limit', required: false, description: 'Số câu hỏi mỗi trang (mặc định: 10)', type: Number })
  @ApiResponse({ status: 200, description: 'Danh sách câu hỏi thành công' })
  async findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return await this.questionsService.findAll(page, limit);
  }

  @Post()
  @ApiOperation({ summary: 'Tạo câu hỏi mới' })
  @ApiResponse({ status: 201, description: 'Tạo câu hỏi thành công' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  async create(@Body() createQuestionDto: CreateQuestionDto) {
    const question = await this.questionsService.create(createQuestionDto);
    return {
      message: 'Tạo câu hỏi thành công',
      question: {
        id: question.QuestionID,
        content: question.Content,
      },
    };
  }

  @Get('search')
  @ApiOperation({ summary: 'Tìm kiếm câu hỏi theo từ khóa và/hoặc kỹ năng' })
  @ApiQuery({ name: 'keyword', required: false, description: 'Từ khóa tìm kiếm' })
  @ApiQuery({ name: 'skillId', required: false, description: 'ID của kỹ năng', type: Number })
  @ApiResponse({ status: 200, description: 'Kết quả tìm kiếm thành công' })
  async search(
    @Query('keyword') keyword: string,
    @Query('skillId') skillId?: string,
  ) {
    const questions = await this.questionsService.search(
      keyword || '',
      skillId ? parseInt(skillId) : undefined,
    );
    return { questions, total: questions.length };
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Lấy thống kê câu hỏi (tùy chọn theo kỹ năng)' })
  @ApiQuery({ name: 'skillId', required: false, description: 'ID của kỹ năng', type: Number })
  @ApiResponse({ status: 200, description: 'Thống kê câu hỏi thành công' })
  async getStatistics(@Query('skillId') skillId?: string) {
    return await this.questionsService.getStatistics(
      skillId ? parseInt(skillId) : undefined,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy chi tiết một câu hỏi' })
  @ApiParam({ name: 'id', description: 'ID của câu hỏi', type: Number })
  @ApiResponse({ status: 200, description: 'Chi tiết câu hỏi thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy câu hỏi' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.questionsService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật câu hỏi' })
  @ApiParam({ name: 'id', description: 'ID của câu hỏi cần cập nhật', type: Number })
  @ApiResponse({ status: 200, description: 'Cập nhật câu hỏi thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy câu hỏi' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateQuestionDto: UpdateQuestionDto,
  ) {
    return await this.questionsService.update(id, updateQuestionDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa câu hỏi' })
  @ApiParam({ name: 'id', description: 'ID của câu hỏi cần xóa', type: Number })
  @ApiResponse({ status: 200, description: 'Xóa câu hỏi thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy câu hỏi' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    return await this.questionsService.remove(id);
  }
}
