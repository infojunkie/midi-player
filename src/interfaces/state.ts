export interface IState {
    endedTracks: number;

    latest: number;

    nowScheduler: null | (() => number);

    offset: number;

    paused: null | number;

    resetScheduler: null | (() => void);

    stopScheduler: null | (() => void);

    resolve(): void;
}
