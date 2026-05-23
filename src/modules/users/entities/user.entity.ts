import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Result } from './result.entity';

export enum UserRole {
  HOC_SINH = 'HocSinh',
  ADMIN = 'Admin',
}

@Entity({ name: 'User' })
export class User {
  @PrimaryGeneratedColumn()
  UserID: number;

  @Column({ length: 100, nullable: true })
  FullName: string;

  @Column({ length: 100, unique: true })
  Email: string;

  @Column({ length: 255 })
  Password: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.HOC_SINH })
  Role: UserRole;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  DateCreated: Date;

  @OneToMany(() => Result, (result) => result.User)
  results: Result[];
}