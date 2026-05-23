import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from '@modules/users/entities/user.entity';
import { RoleModule } from '@modules/roles/role.module';

@Module({
  imports: [TypeOrmModule.forFeature([User]), RoleModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
