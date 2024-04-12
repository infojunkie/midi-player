import { MidiFileSlicer } from 'midi-file-slicer';
import { IMidiFile, TMidiEvent } from 'midi-json-parser-worker';
import { IMidiOutput, IMidiPlayer, IMidiPlayerOptions } from './interfaces';
import { Scheduler } from './scheduler';
import { MidiControllerMessage } from './types/midi-controller-message';
import { PlayerState } from './types/player-state';

export class MidiPlayer implements IMidiPlayer {
    private _encodeMidiMessage: (event: TMidiEvent) => Uint8Array;

    private _endedTracks: null | number;

    private _filterMidiMessage: (event: TMidiEvent) => boolean;

    private _json: IMidiFile;

    private _latest: null | number;

    private _midiFileSlicer: MidiFileSlicer;

    private _midiOutput: IMidiOutput;

    private _offset: null | number;

    private _resolve: null | (() => void);

    private _scheduler: Scheduler;

    private _schedulerSubscription: null | { unsubscribe(): void };

    constructor({ encodeMidiMessage, filterMidiMessage, json, midiFileSlicer, midiOutput, scheduler }: IMidiPlayerOptions) {
        this._encodeMidiMessage = encodeMidiMessage;
        this._endedTracks = null;
        this._filterMidiMessage = filterMidiMessage;
        this._json = json;
        this._midiFileSlicer = midiFileSlicer;
        this._midiOutput = midiOutput;
        this._offset = null;
        this._latest = null;
        this._resolve = null;
        this._scheduler = scheduler;
        this._schedulerSubscription = null;
    }

    public get position(): number | null {
        return this._offset === null ? null : this._scheduler.now() - this._offset;
    }

    public get state(): PlayerState {
        if (this._schedulerSubscription === null && this._resolve === null) {
            return this._endedTracks === null ? PlayerState.Stopped : PlayerState.Paused;
        }

        return PlayerState.Playing;
    }

    public pause(): void {
        if (this.state !== PlayerState.Playing) {
            throw new Error('The player is not currently playing.');
        }

        this._pause();

        if (this._offset !== null) {
            this._offset = this._scheduler.now() - this._offset;
        }
    }

    public play(): Promise<void> {
        if (this.state === PlayerState.Playing) {
            throw new Error('The player is currently playing.');
        }

        this._endedTracks = 0;

        if (this._offset !== null) {
            this._offset = this._scheduler.now() - this._offset;
        }

        return this._promise();
    }

    public resume(): Promise<void> {
        if (this.state !== PlayerState.Paused) {
            throw new Error('The player is not currently paused.');
        }

        if (this._offset !== null) {
            this._offset = this._scheduler.now() - this._offset;
        }

        return this._promise();
    }

    public seek(position: number): void {
        this._clear();

        if (this.state !== PlayerState.Playing) {
            this._offset = position;
        }
        else {
            const now = this._scheduler.now();
            this._offset = now - position;
            this._scheduler.reset(now);
        }
    }

    public stop(): void {
        this._pause();

        this._offset = null;

        this._endedTracks = null;
    }

    private _clear(): void {
        this._midiOutput.clear?.();

        // Send AllSoundOff message to all channels.
        [...Array(16).keys()].forEach(channel => {
            const allSoundOff = this._encodeMidiMessage({
                channel,
                controlChange: {
                  type: MidiControllerMessage.AllSoundOff,
                  value: 127
                }
            } as TMidiEvent);

            if (this._latest !== null) {
                this._midiOutput.send(allSoundOff, this._latest);
            }
        })
    }

    private _pause(): void {
        if (this._resolve !== null) {
            this._resolve();
            this._resolve = null;
        }

        if (this._schedulerSubscription !== null) {
            this._schedulerSubscription.unsubscribe();
            this._schedulerSubscription = null;
        }

        this._clear();
    }

    private _promise(): Promise<void> {
        return new Promise((resolve, reject) => {
            this._resolve = resolve;
            this._schedulerSubscription = this._scheduler.subscribe({
                error: (err) => reject(err),
                next: ({ end, start }) => {
                    if (this._offset === null) {
                        this._offset = start;
                    }
                    if (this._latest === null) {
                        this._latest = start;
                    }

                    this._schedule(start, end);
                }
            });

            if (this._resolve === null) {
                this._schedulerSubscription.unsubscribe();
            }
        });
    }

    private _schedule(start: number, end: number): void {
        if (this._endedTracks === null || this._offset === null || this._resolve === null) {
            throw new Error('The player is in an unexpected state.');
        }

        const events = this._midiFileSlicer.slice(start - this._offset, end - this._offset);

        events
            .filter(({ event }) => this._filterMidiMessage(event))
            .forEach(({ event, time }) => {
                this._midiOutput.send(this._encodeMidiMessage(event), start + time);
                /* tslint:disable-next-line no-non-null-assertion */
                this._latest = Math.max(this._latest!, start + time);
            });

        const endedTracks = events.filter(({ event }) => MidiPlayer._isEndOfTrack(event)).length;

        this._endedTracks += endedTracks;

        if (this._endedTracks === this._json.tracks.length && this._latest !== null && this._scheduler.now() >= this._latest) {
            this.stop();
        }
    }

    private static _isEndOfTrack(event: TMidiEvent): boolean {
        return 'endOfTrack' in event;
    }
}
