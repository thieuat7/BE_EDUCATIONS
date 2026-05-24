import { APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { UsersModule } from '@modules/users/users.module';
import { AuthModule } from '@modules/auth/auth.module';
import { ExamsModule } from '@modules/exams/exams.module';
import { ResultsModule } from '@modules/results/results.module';
import { SubjectsModule } from '@modules/subjects/subjects.module';
import { QuestionsModule } from '@modules/questions/questions.module';
import { HttpExceptionFilter } from '@common/filters/http-exception.filter';
import { ResponseInterceptor } from '@common/interceptors/response.interceptor';
import { SkillsModule } from '@modules/skills/skills.module';
import { LessonsModule } from '@modules/lessons/lessons.module';
import { ChaptersModule } from '@modules/chapters/chapters.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: 'localhost',
      port: 3306,
      username: 'root',
      password: '123456',
      database: 'hethong_tracnghiem',

      autoLoadEntities: true,
      synchronize: false,
    }),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    UsersModule,
    AuthModule,
    ExamsModule,
    ResultsModule,
    SubjectsModule,
    ChaptersModule,
    LessonsModule,
    SkillsModule,
    QuestionsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
  ],
})
export class AppModule {}
