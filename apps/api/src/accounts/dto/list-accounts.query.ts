import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class ListAccountsQuery {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsString()
  ownerId?: string;

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
