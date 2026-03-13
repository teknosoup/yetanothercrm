import { OpportunityStage } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

export class CreateOpportunityDto {
  @IsString()
  @MinLength(1)
  opportunityName!: string;

  @IsString()
  @MinLength(1)
  accountId!: string;

  @IsOptional()
  @IsString()
  contactId?: string;

  @IsOptional()
  @IsEnum(OpportunityStage)
  stage?: OpportunityStage;

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
