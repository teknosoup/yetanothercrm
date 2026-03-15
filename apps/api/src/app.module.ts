import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { minutes, ThrottlerModule } from '@nestjs/throttler';
import { AccountsModule } from './accounts/accounts.module';
import { ActivitiesModule } from './activities/activities.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { AuditModule } from './audit/audit.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { ContactsModule } from './contacts/contacts.module';
import { CustomFieldsModule } from './custom-fields/custom-fields.module';
import { EventBusModule } from './event-bus/event-bus.module';
import { LeadsModule } from './leads/leads.module';
import { NotesModule } from './notes/notes.module';
import { NotificationsModule } from './notifications/notifications.module';
import { OpportunitiesModule } from './opportunities/opportunities.module';
import { PluginsModule } from './plugins/plugins.module';
import { PrismaModule } from './prisma/prisma.module';
import { SearchModule } from './search/search.module';
import { TasksModule } from './tasks/tasks.module';
import { UsersModule } from './users/users.module';
import { RbacModule } from './rbac/rbac.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: minutes(1), limit: 60 }],
    }),
    PrismaModule,
    EventBusModule,
    AuditModule,
    AuthModule,
    UsersModule,
    RbacModule,
    CustomFieldsModule,
    DashboardModule,
    LeadsModule,
    AccountsModule,
    ContactsModule,
    OpportunitiesModule,
    ActivitiesModule,
    TasksModule,
    NotesModule,
    NotificationsModule,
    PluginsModule,
    SearchModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
