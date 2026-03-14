import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class UpsertPluginDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  version?: string;

  @IsOptional()
  config?: unknown;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
