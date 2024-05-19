import { IMidiPlayer, IMidiPlayerOptions } from './interfaces';
import { PlayerState } from './types/player-state';
export declare class MidiPlayer implements IMidiPlayer {
    private _encodeMidiMessage;
    private _filterMidiMessage;
    private _json;
    private _midiFileSlicer;
    private _midiOutput;
    private _startScheduler;
    private _state;
    private _velocity;
    constructor({ encodeMidiMessage, filterMidiMessage, json, midiFileSlicer, midiOutput, startScheduler }: IMidiPlayerOptions);
    get position(): number | undefined;
    set position(position: number);
    get state(): PlayerState;
    get velocity(): number | undefined;
    set velocity(velocity: number);
    pause(): void;
    play(velocity?: number): Promise<void>;
    resume(velocity?: number): Promise<void>;
    stop(): void;
    private _clear;
    private _pause;
    private _promise;
    private _schedule;
    private _stop;
    private static _isEndOfTrack;
}
//# sourceMappingURL=midi-player.d.ts.map