import { TaskStatus } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class CreateTaskDto {
  @IsString()
  @MinLength(1)
  title!: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  description?: string;

  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @IsOptional()
  @Transform(({ value }) =>
    value == null || value === '' ? undefined : new Date(String(value)),
  )
  @IsDate()
  dueDate?: Date;

  @IsOptional()
  @IsString()
  @MinLength(1)
  leadId?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  accountId?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  contactId?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  opportunityId?: string;
}
