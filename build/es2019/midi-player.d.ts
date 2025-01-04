import { IMidiPlayer, IMidiPlayerOptions } from './interfaces';
export declare class MidiPlayer implements IMidiPlayer {
    private _encodeMidiMessage;
    private _filterMidiMessage;
    private _json;
    private _midiFileSlicer;
    private _midiOutput;
    private _repeat;
    private _startIntervalScheduler;
    private _startTimeoutScheduler;
    private _state;
    private _velocity;
    constructor({ encodeMidiMessage, filterMidiMessage, json, midiFileSlicer, midiOutput, startIntervalScheduler, startTimeoutScheduler }: IMidiPlayerOptions);
    get position(): number;
    get state(): 'paused' | 'playing' | 'stopped';
    get velocity(): number | undefined;
    pause(): void;
    play(velocity?: number, repeat?: number): Promise<void>;
    resume(velocity?: number, repeat?: number): Promise<void>;
    stop(): void;
    private _clear;
    private _schedule;
    private _stop;
    private static _isEndOfTrack;
}
//# sourceMappingURL=midi-player.d.ts.map