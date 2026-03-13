import { IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class UpdateAccountDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  companyName?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  segment?: string;

  @IsOptional()
  @IsString()
  industry?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  taxId?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  annualValueEstimate?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
