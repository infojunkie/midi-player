import { IInterval } from '../interfaces';
export declare const createStartScheduler: (clearInterval: Window["clearInterval"], performance: Window["performance"], setInterval: Window["setInterval"]) => (next: (interval: IInterval) => void) => {
    now: () => number;
    reset: () => void;
    stop: () => void;
};
//# sourceMappingURL=start-scheduler.d.ts.map