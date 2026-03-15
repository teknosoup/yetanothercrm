import { Module } from '@nestjs/common';
import { CustomFieldsModule } from '../custom-fields/custom-fields.module';
import { TimelineModule } from '../timeline/timeline.module';
import { ContactsController } from './contacts.controller';
import { ContactsService } from './contacts.service';

@Module({
  imports: [TimelineModule, CustomFieldsModule],
  controllers: [ContactsController],
  providers: [ContactsService],
})
export class ContactsModule {}
