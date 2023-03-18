import { Observer } from 'rxjs';
import { IInterval } from './interfaces';
export declare class Scheduler {
    private _clearInterval;
    private _performance;
    private _setInterval;
    private _intervalId;
    private _nextTick;
    private _numberOfSubscribers;
    private _subject;
    constructor(_clearInterval: Window['clearInterval'], _performance: Window['performance'], _setInterval: Window['setInterval']);
    now(): number;
    reset(currentTime: number): void;
    subscribe(observer: Partial<Observer<IInterval>>): {
        unsubscribe(): void;
    };
    private _start;
    private _stop;
}
//# sourceMappingURL=scheduler.d.ts.map