import { Module } from '@nestjs/common';
import { CustomFieldsModule } from '../custom-fields/custom-fields.module';
import { TimelineModule } from '../timeline/timeline.module';
import { AccountsController } from './accounts.controller';
import { AccountsService } from './accounts.service';

@Module({
  imports: [TimelineModule, CustomFieldsModule],
  controllers: [AccountsController],
  providers: [AccountsService],
})
export class AccountsModule {}
