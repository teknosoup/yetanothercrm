import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { NotesController } from './notes.controller';
import { NotesService } from './notes.service';

@Module({
  imports: [NotificationsModule],
  controllers: [NotesController],
  providers: [NotesService],
})
export class NotesModule {}
