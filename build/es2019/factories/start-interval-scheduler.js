const INTERVAL = 500;
export const createStartIntervalScheduler = (clearInterval, performance, setInterval) => (next) => {
    const start = performance.now();
    // FIXME Remove INTERVAL addition as per https://github.com/infojunkie/midi-player/commit/3246da9afd3cb2475d37e900a38c2755c4bcf519#diff-8a4bd800733f7c8acd7513b26f37baa32d954603b3c5a45e92741aa04a14bc45L341
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
        peek: () => performance.now(),
        reset: () => {
            nextTick = performance.now() - INTERVAL;
            end = nextTick + INTERVAL;
            next({ end, start: nextTick });
        },
        stop: () => clearInterval(intervalId),
    };
};
//# sourceMappingURL=start-interval-scheduler.js.map