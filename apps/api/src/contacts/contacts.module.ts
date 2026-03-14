import { Module } from '@nestjs/common';
import { TimelineModule } from '../timeline/timeline.module';
import { ContactsController } from './contacts.controller';
import { ContactsService } from './contacts.service';

@Module({
  imports: [TimelineModule],
  controllers: [ContactsController],
  providers: [ContactsService],
})
export class ContactsModule {}
