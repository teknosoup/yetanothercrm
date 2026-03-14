import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class GlobalSearchQuery {
  @IsString()
  @MinLength(1)
  q!: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  entities?: string;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  take?: number;
}
