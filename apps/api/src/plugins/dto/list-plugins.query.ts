import { Transform } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

export class ListPluginsQuery {
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
