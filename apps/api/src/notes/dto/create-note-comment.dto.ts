import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreateNoteCommentDto {
  @IsString()
  @MinLength(1)
  body!: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  parentId?: string;
}
