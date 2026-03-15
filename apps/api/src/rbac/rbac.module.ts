import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { RolesController } from './roles.controller';
import { PermissionsController } from './permissions.controller';
import { RbacService } from './rbac.service';

@Module({
  imports: [AuditModule],
  controllers: [RolesController, PermissionsController],
  providers: [RbacService],
  exports: [RbacService],
})
export class RbacModule {}
