import { Transform } from 'class-transformer';
import {
  IsDate,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

export class ListNotesQuery {
  @IsOptional()
  @IsString()
  @MinLength(1)
  entityType?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  entityId?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  authorUserId?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  q?: string;

  @IsOptional()
  @Transform(({ value }) =>
    value == null || value === '' ? undefined : new Date(String(value)),
  )
  @IsDate()
  from?: Date;

  @IsOptional()
  @Transform(({ value }) =>
    value == null || value === '' ? undefined : new Date(String(value)),
  )
  @IsDate()
  to?: Date;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(0)
  skip?: number;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  take?: number;
}
