import { Transform } from 'class-transformer';
import { IsDate, IsOptional, IsString, MinLength } from 'class-validator';

export class DashboardMetricsQuery {
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
  @IsString()
  @MinLength(1)
  ownerId?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  source?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  region?: string;
}
