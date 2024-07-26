export interface IState {
    nowScheduler: null | (() => number);
    offset: number;
    paused: null | number;
    resetScheduler: null | (() => void);
    stopScheduler: null | (() => void);
    resolve(): void;
}
//# sourceMappingURL=state.d.ts.map