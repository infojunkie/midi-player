export interface IState {
    next: null | number;

    nowScheduler: null | (() => number);

    offset: number;

    paused: null | number;

    repeat: number;

    resetScheduler: null | (() => void);

    stopScheduler: null | (() => void);

    resolve(): void;
}
