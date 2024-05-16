import { PlayerState } from '../types/player-state';

export interface IMidiPlayer {
    position: number | null;

    readonly state: PlayerState;

    velocity: number;

    pause(): void;

    play(): Promise<void>;

    resume(): Promise<void>;

    stop(): void;
}
