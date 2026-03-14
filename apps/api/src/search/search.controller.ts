import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../common/auth/jwt-auth.guard';
import { RequirePermissions } from '../common/auth/permissions.decorator';
import { PermissionsGuard } from '../common/auth/permissions.guard';
import type { RequestUser } from '../common/auth/request-user';
import { GlobalSearchQuery } from './dto/global-search.query';
import { SearchService } from './search.service';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @RequirePermissions('search.read')
  @Get()
  async search(
    @Query() query: GlobalSearchQuery,
    @CurrentUser() user: RequestUser,
  ) {
    return this.searchService.search(query, user);
  }
}
