import { PlayerState } from '../types/player-state';
export interface IMidiPlayer {
    readonly position: number | null;
    readonly state: PlayerState;
    pause(): void;
    play(): Promise<void>;
    resume(): Promise<void>;
    seek(position: number): void;
    stop(): void;
}
//# sourceMappingURL=midi-player.d.ts.map