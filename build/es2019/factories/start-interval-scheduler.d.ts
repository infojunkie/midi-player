import { IInterval } from '../interfaces';
export declare const createStartIntervalScheduler: (clearInterval: Window["clearInterval"], performance: Window["performance"], setInterval: Window["setInterval"]) => (next: (interval: IInterval) => void) => {
    peek: () => number;
    reset: () => void;
    stop: () => void;
};
//# sourceMappingURL=start-interval-scheduler.d.ts.map