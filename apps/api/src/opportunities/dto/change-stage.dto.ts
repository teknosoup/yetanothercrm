import { OpportunityStage } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class ChangeStageDto {
  @IsEnum(OpportunityStage)
  stage!: OpportunityStage;

  @IsOptional()
  @IsString()
  lostReason?: string;

  @IsOptional()
  @IsString()
  note?: string;
}
