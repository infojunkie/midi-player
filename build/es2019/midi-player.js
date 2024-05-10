import { PlayerState } from './types/player-state';
const ALL_SOUND_OFF_EVENT_DATA = Array.from({ length: 16 }, (_, index) => new Uint8Array([176 + index, 120, 0]));
export class MidiPlayer {
    constructor({ encodeMidiMessage, filterMidiMessage, json, midiFileSlicer, midiOutput, scheduler }) {
        this._encodeMidiMessage = encodeMidiMessage;
        this._filterMidiMessage = filterMidiMessage;
        this._json = json;
        this._midiFileSlicer = midiFileSlicer;
        this._midiOutput = midiOutput;
        this._scheduler = scheduler;
        this._state = null;
    }
    get position() {
        return this._state === null ? null : this._scheduler.now() - this._state.offset;
    }
    get state() {
        if (this._state === null) {
            return PlayerState.Stopped;
        }
        if (this._state.paused !== null) {
            return PlayerState.Paused;
        }
        return PlayerState.Playing;
    }
    pause() {
        if (this.state !== PlayerState.Playing) {
            throw new Error('The player is not currently playing.');
        }
        this._clear();
        this._pause(this._state);
    }
    play() {
        if (this.state !== PlayerState.Stopped) {
            throw new Error('The player is not currently stopped.');
        }
        return this._promise();
    }
    resume() {
        if (this.state !== PlayerState.Paused) {
            throw new Error('The player is not currently paused.');
        }
        return this._promise();
    }
    seek(position) {
        if (this.state === PlayerState.Stopped) {
            throw new Error('The player is currently stopped.');
        }
        this._clear();
        const state = this._state;
        if (this.state === PlayerState.Paused) {
            state.paused = position - 1;
        }
        else if (this.state === PlayerState.Playing) {
            const now = this._scheduler.now();
            state.offset = now - position;
            this._scheduler.reset(now);
        }
    }
    stop() {
        if (this.state === PlayerState.Stopped) {
            throw new Error('The player is already stopped.');
        }
        this._clear();
        this._stop(this._state);
    }
    _clear() {
        var _a, _b;
        // Bug #1: Chrome does not yet implement the clear() method.
        (_b = (_a = this._midiOutput).clear) === null || _b === void 0 ? void 0 : _b.call(_a);
        ALL_SOUND_OFF_EVENT_DATA.forEach((data) => this._midiOutput.send(data));
    }
    _pause(state) {
        const { resolve, schedulerSubscription } = state;
        schedulerSubscription === null || schedulerSubscription === void 0 ? void 0 : schedulerSubscription.unsubscribe();
        state.schedulerSubscription = null;
        state.paused = this._scheduler.now() - state.offset;
        resolve();
    }
    _promise() {
        return new Promise((resolve, reject) => {
            const schedulerSubscription = this._scheduler.subscribe({
                error: (err) => reject(err),
                next: ({ end, start }) => {
                    if (this._state === null) {
                        this._state = { endedTracks: 0, offset: start, resolve, schedulerSubscription: null, latest: start, paused: null };
                    }
                    if (this._state.paused !== null) {
                        this._state.offset = start - this._state.paused;
                        this._state.paused = null;
                    }
                    this._schedule(start, end, this._state);
                }
            });
            if (this._state === null) {
                schedulerSubscription.unsubscribe();
            }
            else {
                this._state.schedulerSubscription = schedulerSubscription;
            }
        });
    }
    _schedule(start, end, state) {
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
    _stop(state) {
        const { resolve, schedulerSubscription } = state;
        schedulerSubscription === null || schedulerSubscription === void 0 ? void 0 : schedulerSubscription.unsubscribe();
        this._state = null;
        resolve();
    }
    static _isEndOfTrack(event) {
        return 'endOfTrack' in event;
    }
}
//# sourceMappingURL=midi-player.js.map