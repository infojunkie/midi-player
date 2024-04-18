export interface IState {
    endedTracks: number;
    latest: number;
    offset: number;
    paused: null | number;
    schedulerSubscription: null | {
        unsubscribe(): void;
    };
    resolve(): void;
}
//# sourceMappingURL=state.d.ts.map