import { IMidiPlayer, IMidiPlayerOptions } from './interfaces';
import { PlayerState } from './types/player-state';
export declare class MidiPlayer implements IMidiPlayer {
    private _encodeMidiMessage;
    private _isSendableEvent;
    private _endedTracks;
    private _json;
    private _latest;
    private _midiFileSlicer;
    private _midiOutput;
    private _offset;
    private _resolve;
    private _scheduler;
    private _schedulerSubscription;
    constructor({ encodeMidiMessage, isSendableEvent, json, midiFileSlicer, midiOutput, scheduler }: IMidiPlayerOptions);
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
    private static _isEndOfTrack;
    private static _isSendableEvent;
}
//# sourceMappingURL=midi-player.d.ts.map