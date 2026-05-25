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
import { QuestionsService } from './questions.service';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';

@Controller('questions')
export class QuestionsController {
  constructor(private readonly questionsService: QuestionsService) {}

  @Get()
  async findAll(
    // 💡 Chèn DefaultValuePipe vào trước ParseIntPipe
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    const result = await this.questionsService.findAll(page, limit);
    return result;
  }
  @Post()
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

  // Route tĩnh phải đặt TRƯỚC route :id
  @Get('search')
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
  async getStatistics(@Query('skillId') skillId?: string) {
    const statistics = await this.questionsService.getStatistics(
      skillId ? parseInt(skillId) : undefined,
    );
    return statistics;
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const question = await this.questionsService.findOne(id);
    return question;
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateQuestionDto: UpdateQuestionDto,
  ) {
    const question = await this.questionsService.update(id, updateQuestionDto);
    return question;
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    return await this.questionsService.remove(id);
  }
}
