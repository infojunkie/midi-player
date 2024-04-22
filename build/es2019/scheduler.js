import { Subject, merge, of } from 'rxjs';
const INTERVAL = 500;
export class Scheduler {
    constructor(_clearInterval, _performance, _setInterval) {
        this._clearInterval = _clearInterval;
        this._performance = _performance;
        this._setInterval = _setInterval;
        this._intervalId = null;
        this._nextTick = 0;
        this._numberOfSubscribers = 0;
        this._subject = new Subject();
    }
    now() {
        return this._performance.now();
    }
    reset(currentTime) {
        this._nextTick = currentTime - INTERVAL;
        this._subject.next({ end: this._nextTick + INTERVAL, start: this._nextTick });
    }
    subscribe(observer) {
        this._numberOfSubscribers += 1;
        const currentTime = this._performance.now();
        if (this._numberOfSubscribers === 1) {
            this._start(currentTime);
        }
        // tslint:disable-next-line:deprecation
        const subscription = merge(of({ end: this._nextTick + INTERVAL, start: currentTime }), this._subject).subscribe(observer);
        const unsubscribe = () => {
            this._numberOfSubscribers -= 1;
            if (this._numberOfSubscribers === 0) {
                this._stop();
            }
            return subscription.unsubscribe();
        };
        return { unsubscribe };
    }
    _start(currentTime) {
        this._nextTick = currentTime + INTERVAL;
        this._intervalId = this._setInterval(() => {
            if (this._performance.now() >= this._nextTick) {
                this._nextTick += INTERVAL;
                this._subject.next({ end: this._nextTick + INTERVAL, start: this._nextTick });
            }
        }, INTERVAL / 10);
    }
    _stop() {
        if (this._intervalId !== null) {
            this._clearInterval(this._intervalId);
        }
        this._intervalId = null;
    }
}
//# sourceMappingURL=scheduler.js.map