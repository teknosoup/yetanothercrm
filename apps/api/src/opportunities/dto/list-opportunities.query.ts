import { OpportunityStage } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class ListOpportunitiesQuery {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsEnum(OpportunityStage)
  stage?: OpportunityStage;

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
