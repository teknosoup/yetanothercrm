import { IsOptional, IsString, MinLength } from 'class-validator';

export class AssignLeadDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  ownerId?: string;
}
