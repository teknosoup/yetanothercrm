import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { TimelineModule } from '../timeline/timeline.module';
import { LeadsController } from './leads.controller';
import { LeadsService } from './leads.service';

@Module({
  imports: [TimelineModule, NotificationsModule],
  controllers: [LeadsController],
  providers: [LeadsService],
})
export class LeadsModule {}
