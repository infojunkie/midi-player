const INTERVAL = 500;
export const createStartScheduler = (clearInterval, performance, setInterval) => (next) => {
    const start = performance.now();
    let nextTick = start + INTERVAL;
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
            const start = performance.now();
            nextTick = start - INTERVAL;
            end = nextTick + INTERVAL;
            next({ end, start: nextTick });
        },
        stop: () => {
            clearInterval(intervalId);
        }
    };
};
//# sourceMappingURL=start-scheduler.js.map