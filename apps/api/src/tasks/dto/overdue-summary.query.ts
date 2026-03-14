import { Transform } from 'class-transformer';
import { IsDate, IsOptional } from 'class-validator';

export class OverdueSummaryQuery {
  @IsOptional()
  @Transform(({ value }) =>
    value == null || value === '' ? undefined : new Date(String(value)),
  )
  @IsDate()
  asOf?: Date;
}
