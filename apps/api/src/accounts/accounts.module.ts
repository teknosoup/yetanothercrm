import { Module } from '@nestjs/common';
import { TimelineModule } from '../timeline/timeline.module';
import { AccountsController } from './accounts.controller';
import { AccountsService } from './accounts.service';

@Module({
  imports: [TimelineModule],
  controllers: [AccountsController],
  providers: [AccountsService],
})
export class AccountsModule {}
