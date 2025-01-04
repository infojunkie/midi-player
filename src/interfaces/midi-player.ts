export interface IMidiPlayer {
    position: number | undefined;

    readonly state: 'paused' | 'playing' | 'stopped';

    velocity: number | undefined;

    pause(): void;

    play(velocity?: number, repeat?: number): Promise<void>;

    resume(velocity?: number, repeat?: number): Promise<void>;

    stop(): void;
}
