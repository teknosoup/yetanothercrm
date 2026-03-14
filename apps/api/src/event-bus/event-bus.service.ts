import { Injectable } from '@nestjs/common';
import { Observable, Subject, filter } from 'rxjs';

export type CrmEvent<TPayload = unknown> = {
  type: string;
  occurredAt: Date;
  actorUserId?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  payload?: TPayload;
};

@Injectable()
export class EventBusService {
  private readonly subject = new Subject<CrmEvent>();

  emit(event: Omit<CrmEvent, 'occurredAt'> & { occurredAt?: Date }) {
    const normalized: CrmEvent = {
      ...event,
      occurredAt: event.occurredAt ?? new Date(),
    };
    this.subject.next(normalized);
    return normalized;
  }

  events$(): Observable<CrmEvent> {
    return this.subject.asObservable();
  }

  on(type: string): Observable<CrmEvent> {
    return this.subject.asObservable().pipe(filter((e) => e.type === type));
  }
}
