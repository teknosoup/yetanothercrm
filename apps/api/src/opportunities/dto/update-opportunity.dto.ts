import { Transform } from 'class-transformer';
import {
  IsDate,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

export class UpdateOpportunityDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  opportunityName?: string;

  @IsOptional()
  @IsString()
  accountId?: string;

  @IsOptional()
  @IsString()
  contactId?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  estimatedValue?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  probability?: number;

  @IsOptional()
  @Transform(({ value }) =>
    value == null || value === '' ? undefined : new Date(String(value)),
  )
  @IsDate()
  expectedCloseDate?: Date;
}
