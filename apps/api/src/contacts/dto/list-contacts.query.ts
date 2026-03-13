import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class ListContactsQuery {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsString()
  ownerId?: string;

  @IsOptional()
  @IsString()
  accountId?: string;

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
