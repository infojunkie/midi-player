import { IInterval } from '../interfaces';

const INTERVAL = 500;

export const createStartScheduler =
    (clearInterval: Window['clearInterval'], performance: Window['performance'], setInterval: Window['setInterval']) =>
    (next: (interval: IInterval) => void) => {
        const start = performance.now();

        let nextTick = start;
        let end = nextTick + INTERVAL;

        const intervalId = setInterval(() => {
            if (performance.now() >= nextTick) {
                nextTick = end;
                end += INTERVAL;

                next({ end, start: nextTick });
            }
        }, INTERVAL / 10);

        next({ end, start });

        return {
            now: () => {
                return performance.now();
            },
            reset: () => {
                nextTick = performance.now() - INTERVAL;
                end = nextTick + INTERVAL;

                next({ end, start: nextTick });
            },
            stop: () => {
                clearInterval(intervalId);
            }
        };
    };
