import { PlayerState } from '../types/player-state';

export interface IMidiPlayer {
    position: number | undefined;

    readonly state: PlayerState;

    velocity: number | undefined;

    pause(): void;

    play(velocity?: number, repeat?: number): Promise<void>;

    resume(velocity?: number, repeat?: number): Promise<void>;

    stop(): void;
}
