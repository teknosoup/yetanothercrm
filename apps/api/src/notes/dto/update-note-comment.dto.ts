import { IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateNoteCommentDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  body?: string;
}
