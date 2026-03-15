import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';

const ENTITY_TYPES = ['LEAD', 'ACCOUNT', 'CONTACT', 'OPPORTUNITY'] as const;

export class ListCustomFieldsQuery {
  @IsOptional()
  @IsIn(ENTITY_TYPES)
  entityType?: (typeof ENTITY_TYPES)[number];

  @IsOptional()
  @IsString()
  @MinLength(1)
  q?: string;
}
