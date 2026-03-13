import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateContactDto {
  @IsString()
  @MinLength(1)
  fullName!: string;

  @IsOptional()
  @IsString()
  jobTitle?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  preferredChannel?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  accountId?: string;
}
