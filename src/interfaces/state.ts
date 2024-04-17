export interface IState {
    endedTracks: number;

    latest: null | number;

    offset: number;

    schedulerSubscription: null | { unsubscribe(): void };

    resolve(): void;
}
