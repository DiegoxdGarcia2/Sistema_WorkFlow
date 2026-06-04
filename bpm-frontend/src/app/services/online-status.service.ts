import { Injectable, signal, WritableSignal } from '@angular/core';
import { Subject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class OnlineStatusService {
  private isOnlineSignal: WritableSignal<boolean> = signal(navigator.onLine);
  private onlineStatus$ = new Subject<boolean>();

  public readonly isOnline = this.isOnlineSignal.asReadonly();

  constructor() {
    window.addEventListener('online', () => this.updateStatus(true));
    window.addEventListener('offline', () => this.updateStatus(false));
  }

  private updateStatus(status: boolean) {
    this.isOnlineSignal.set(status);
    this.onlineStatus$.next(status);
  }

  get statusChanges(): Observable<boolean> {
    return this.onlineStatus$.asObservable();
  }
}
