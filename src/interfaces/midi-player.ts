import { PlayerState } from '../types/player-state';

export interface IMidiPlayer {
    readonly state: PlayerState;

    readonly position: number;

    pause(): void;

    play(): Promise<void>;

    resume(): Promise<void>;

    stop(): void;

    seek(position: number): void;
}
