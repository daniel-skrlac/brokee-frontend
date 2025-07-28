import { Injectable } from '@angular/core';
import { Subject, Observable } from 'rxjs';

export type NotificationType = 'success' | 'error';

export interface ApiNotificationScreen {
    message: string;
    type: NotificationType;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
    private subject = new Subject<ApiNotificationScreen>();
    get notifications$(): Observable<ApiNotificationScreen> {
        return this.subject.asObservable();
    }
    notify(message: string, type: NotificationType = 'success') {
        this.subject.next({ message, type });
    }
}
