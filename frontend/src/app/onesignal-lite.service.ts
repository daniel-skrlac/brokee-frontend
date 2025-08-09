import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from './environments/environment';

declare global { interface Window { OneSignalDeferred?: any[]; } }

function withOneSignal<T>(cb: (os: any) => T | Promise<T>): Promise<T> {
    return new Promise<T>((resolve) => {
        window.OneSignalDeferred = window.OneSignalDeferred || [];
        window.OneSignalDeferred.push(async (os: any) => resolve(await cb(os)));
    });
}

@Injectable({ providedIn: 'root' })
export class OneSignalLiteService {
    private listenerAttached = false;

    private startedFor: string | null = null;
    private startInflight: Promise<void> | null = null;
    private lastRegisteredSubId: string | null = null;

    constructor(private http: HttpClient) { }

    async start(userSub: string) {
        if (!userSub) return;

        if (this.startedFor === userSub && this.startInflight) {
            return this.startInflight;
        }

        this.startInflight = (async () => {
            if ('serviceWorker' in navigator) {
                await this.waitForOneSignalSwActivated(10_000);
                await this.waitForController(8_000);
            }

            await withOneSignal(async (os) => {
                if (typeof os.initialized === 'function') {
                    try { await os.initialized(); } catch { }
                }

                const perm = await this.normalizePermission(await os.Notifications.permission);
                if (perm === 'default') {
                    await os.Notifications.requestPermission();
                }

                if (await this.normalizePermission(await os.Notifications.permission) === 'denied') {
                    return;
                }

                const isSub = typeof os.Notifications.isSubscribed === 'function'
                    ? await os.Notifications.isSubscribed()
                    : !!os.User?.PushSubscription?.id;

                if (!isSub) {
                    await os.Notifications.subscribe();
                }
            });

            await this.sleep(250);

            const subId = await this.getSubscriptionId();
            if (subId && subId !== this.lastRegisteredSubId) {
                this.lastRegisteredSubId = subId;
                console.log('[push] registering subId', subId);
                await firstValueFrom(
                    this.http.post(`${environment.apiUrl}/notifications/register`, { subscriptionId: subId })
                );
            }

            this.attachChangeListener();
        })();

        try {
            await this.startInflight;
        } finally {
            this.startedFor = userSub;
            this.startInflight = null;
        }
    }

    async deregisterOnLogout(opts: { removeAlias?: boolean; unsubscribe?: boolean } = {}) {
        const { removeAlias = true, unsubscribe = false } = opts;

        const subId = await this.getSubscriptionId();
        if (subId) {
            try {
                await firstValueFrom(
                    this.http.post(`${environment.apiUrl}/notifications/deregister`, { subscriptionId: subId })
                );
            } catch (e) {
            }
        }

        if (removeAlias) {
            await withOneSignal(os => os.logout?.().catch(() => { }));
        }
        if (unsubscribe) {
            await withOneSignal(os => os.Notifications.unsubscribe?.().catch(() => { }));
        }

        this.startedFor = null;
        this.lastRegisteredSubId = null;
    }

    private async getSubscriptionId(): Promise<string | null> {
        return withOneSignal(os => os.User?.PushSubscription?.id ?? null);
    }

    private attachChangeListener() {
        if (this.listenerAttached) return;
        this.listenerAttached = true;

        withOneSignal((os) => {
            os.User?.PushSubscription?.addEventListener('change', async (ev: any) => {
                const nextId: string | null = ev?.current?.id ?? null;
                if (!nextId || nextId === this.lastRegisteredSubId) return;

                try {
                    console.log('[push] sub changed; re-registering', nextId);
                    await firstValueFrom(
                        this.http.post(`${environment.apiUrl}/notifications/register`, { subscriptionId: nextId })
                    );
                    this.lastRegisteredSubId = nextId;
                } catch {
                }
            });
        });
    }

    private async waitForOneSignalSwActivated(timeoutMs = 10_000) {
        const deadline = Date.now() + timeoutMs;
        const check = async () => {
            const regs = await navigator.serviceWorker.getRegistrations();
            const osw = regs.find(r => {
                const urls = [r.active?.scriptURL, r.installing?.scriptURL, r.waiting?.scriptURL]
                    .filter(Boolean) as string[];
                return urls.some(u => u.includes('OneSignalSDKWorker.js'));
            });
            if (!osw) return false;
            if (osw.active?.state === 'activated') return true;

            const w = osw.installing || osw.waiting || osw.active;
            if (w) {
                await new Promise<void>(res => {
                    const onState = () => {
                        if (w.state === 'activated') {
                            w.removeEventListener('statechange', onState);
                            res();
                        }
                    };
                    w.addEventListener('statechange', onState);
                });
                return true;
            }
            return false;
        };

        while (Date.now() < deadline) {
            try { if (await check()) return; } catch { }
            await this.sleep(150);
        }
    }

    private async waitForController(timeoutMs = 8_000) {
        if (navigator.serviceWorker.controller) return;
        await new Promise<void>((res) => {
            const t = setTimeout(() => res(), timeoutMs);
            navigator.serviceWorker.addEventListener('controllerchange', () => {
                clearTimeout(t); res();
            }, { once: true });
        });
    }

    private async normalizePermission(
        v: 'default' | 'granted' | 'denied' | boolean
    ): Promise<'default' | 'granted' | 'denied'> {
        if (v === true) return 'granted';
        if (v === false) return 'denied';
        return v;
    }

    private sleep(ms: number) { return new Promise(res => setTimeout(res, ms)); }
}
