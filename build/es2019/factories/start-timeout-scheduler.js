export const createStartTimeoutScheduler = (clearTimeout, setTimeout) => (handler, timeout) => {
    const timeoutId = setTimeout(handler, timeout);
    return () => clearTimeout(timeoutId);
};
//# sourceMappingURL=start-timeout-scheduler.js.map