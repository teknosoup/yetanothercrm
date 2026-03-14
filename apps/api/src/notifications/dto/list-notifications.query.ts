import { BadRequestException } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, Min } from 'class-validator';

export class ListNotificationsQuery {
  @IsOptional()
  @Transform(({ value }) => {
    if (value == null || value === '') return undefined;
    if (value === true || value === 'true') return true;
    if (value === false || value === 'false') return false;
    throw new BadRequestException('Invalid unreadOnly');
  })
  @IsBoolean()
  unreadOnly?: boolean;

  @IsOptional()
  @Transform(({ value }) =>
    value == null || value === '' ? undefined : Number(value),
  )
  @IsInt()
  @Min(0)
  skip?: number;

  @IsOptional()
  @Transform(({ value }) =>
    value == null || value === '' ? undefined : Number(value),
  )
  @IsInt()
  @Min(1)
  take?: number;
}
