import { IMidiPlayer, IMidiPlayerOptions } from './interfaces';
import { PlayerState } from './types/player-state';
export declare class MidiPlayer implements IMidiPlayer {
    private _encodeMidiMessage;
    private _filterMidiMessage;
    private _json;
    private _midiFileSlicer;
    private _midiOutput;
    private _scheduler;
    private _state;
    constructor({ encodeMidiMessage, filterMidiMessage, json, midiFileSlicer, midiOutput, scheduler }: IMidiPlayerOptions);
    get position(): number | null;
    get state(): PlayerState;
    pause(): void;
    play(): Promise<void>;
    resume(): Promise<void>;
    seek(position: number): void;
    stop(): void;
    private _clear;
    private _pause;
    private _promise;
    private _schedule;
    private _stop;
    private static _isEndOfTrack;
}
//# sourceMappingURL=midi-player.d.ts.map