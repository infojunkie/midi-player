import { MidiFileSlicer } from 'midi-file-slicer';
import { IMidiFile, TMidiEvent } from 'midi-json-parser-worker';
import { IMidiOutput, IMidiPlayer, IMidiPlayerOptions, IState } from './interfaces';
import { Scheduler } from './scheduler';
import { PlayerState } from './types/player-state';

const ALL_SOUND_OFF_EVENT_DATA = Array.from({ length: 16 }, (_, index) => new Uint8Array([176 + index, 120, 0]));

export class MidiPlayer implements IMidiPlayer {
    private _encodeMidiMessage: (event: TMidiEvent) => Uint8Array;

    private _filterMidiMessage: (event: TMidiEvent) => boolean;

    private _json: IMidiFile;

    private _midiFileSlicer: MidiFileSlicer;

    private _midiOutput: IMidiOutput;

    private _scheduler: Scheduler;

    private _state: null | IState;

    constructor({ encodeMidiMessage, filterMidiMessage, json, midiFileSlicer, midiOutput, scheduler }: IMidiPlayerOptions) {
        this._encodeMidiMessage = encodeMidiMessage;
        this._filterMidiMessage = filterMidiMessage;
        this._json = json;
        this._midiFileSlicer = midiFileSlicer;
        this._midiOutput = midiOutput;
        this._scheduler = scheduler;
        this._state = null;
    }

    public get position(): number | null {
        return this._state === null ? null : this._scheduler.now() - this._state.offset;
    }

    public get state(): PlayerState {
        if (this._state === null) {
            return PlayerState.Stopped;
        }

        if (this._state.paused !== null) {
            return PlayerState.Paused;
        }

        return PlayerState.Playing;
    }

    public pause(): void {
        if (this.state !== PlayerState.Playing) {
            throw new Error('The player is not currently playing.');
        }

        this._clear();

        this._pause(this._state as IState);
    }

    public play(): Promise<void> {
        if (this.state !== PlayerState.Stopped) {
            throw new Error('The player is not currently stopped.');
        }

        return this._promise();
    }

    public resume(): Promise<void> {
        if (this.state !== PlayerState.Paused) {
            throw new Error('The player is not currently paused.');
        }

        return this._promise();
    }

    public seek(position: number): void {
        if (this.state === PlayerState.Stopped) {
            throw new Error('The player is currently stopped.');
        }

        this._clear();

        const state = this._state as IState;
        if (this.state === PlayerState.Paused) {
            state.paused = position;
        }
        else if (this.state === PlayerState.Playing) {
            const now = this._scheduler.now();
            state.offset = now - position;
            this._scheduler.reset(now);
        }
    }

    public stop(): void {
        if (this.state === PlayerState.Stopped) {
            // Don't throw because stop() is idempotent.
            return;
        }

        this._clear();

        this._stop(this._state as IState);
    }

    private _clear(): void {
        // Bug #1: Chrome does not yet implement the clear() method.
        this._midiOutput.clear?.();
        ALL_SOUND_OFF_EVENT_DATA.forEach((data) => this._midiOutput.send(data));
    }

    private _pause(state: IState): void {
        const { resolve, schedulerSubscription } = state;

        schedulerSubscription?.unsubscribe();

        state.schedulerSubscription = null;
        state.paused = this._scheduler.now() - state.offset;

        resolve();
    }

    private _promise(): Promise<void> {
        return new Promise((resolve, reject) => {
            const schedulerSubscription = this._scheduler.subscribe({
                error: (err) => reject(err),
                next: ({ end, start }) => {
                    if (this._state === null) {
                        this._state = { endedTracks: 0, offset: start, resolve, schedulerSubscription: null, latest: start, paused: null };
                    }
                    if (this._state.paused !== null) {
                        this._state.offset = this._scheduler.now() - this._state.paused;
                        this._state.paused = null;
                    }
                    this._schedule(start, end, this._state);
                }
            });

            if (this._state === null) {
                schedulerSubscription.unsubscribe();
            } else {
                this._state.schedulerSubscription = schedulerSubscription;
            }
        });
    }

    private _schedule(start: number, end: number, state: IState): void {
        const events = this._midiFileSlicer.slice(start - state.offset, end - state.offset);

        events
            .filter(({ event }) => this._filterMidiMessage(event))
            .forEach(({ event, time }) => {
                this._midiOutput.send(this._encodeMidiMessage(event), start + time);
                state.latest = Math.max(state.latest, start + time);
            });

        const endedTracks = events.filter(({ event }) => MidiPlayer._isEndOfTrack(event)).length;

        state.endedTracks += endedTracks;

        if (state.endedTracks === this._json.tracks.length && this._scheduler.now() >= state.latest) {
            this._stop(state);
        }
    }

    private _stop(state: IState): void {
        const { resolve, schedulerSubscription } = state;

        schedulerSubscription?.unsubscribe();

        this._state = null;

        resolve();
    }

    private static _isEndOfTrack(event: TMidiEvent): boolean {
        return 'endOfTrack' in event;
    }
}