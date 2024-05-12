import { PlayerState } from './types/player-state';
const ALL_SOUND_OFF_EVENT_DATA = Array.from({ length: 16 }, (_, index) => new Uint8Array([176 + index, 120, 0]));
export class MidiPlayer {
    constructor({ encodeMidiMessage, filterMidiMessage, json, midiFileSlicer, midiOutput, startScheduler }) {
        this._encodeMidiMessage = encodeMidiMessage;
        this._filterMidiMessage = filterMidiMessage;
        this._json = json;
        this._midiFileSlicer = midiFileSlicer;
        this._midiOutput = midiOutput;
        this._startScheduler = startScheduler;
        this._state = null;
    }
    get position() {
        if (this._state === null) {
            return null;
        }
        const nowScheduler = this._state.nowScheduler;
        return nowScheduler() - this._state.offset;
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
        var _a;
        if (this.state === PlayerState.Stopped) {
            throw new Error('The player is currently stopped.');
        }
        this._clear();
        const state = this._state;
        if (this.state === PlayerState.Paused) {
            state.paused = position - 1;
        }
        else if (this.state === PlayerState.Playing) {
            const nowScheduler = state.nowScheduler;
            state.offset = nowScheduler() - position;
            (_a = state.resetScheduler) === null || _a === void 0 ? void 0 : _a.call(state);
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
        const { resolve, stopScheduler } = state;
        stopScheduler === null || stopScheduler === void 0 ? void 0 : stopScheduler();
        const nowScheduler = state.nowScheduler;
        state.paused = nowScheduler() - state.offset;
        resolve();
    }
    _promise() {
        return new Promise((resolve) => {
            const { stop: stopScheduler, reset: resetScheduler, now: nowScheduler } = this._startScheduler(({ end, start }) => {
                if (this._state === null) {
                    this._state = { endedTracks: 0, offset: start, resolve, stopScheduler: null, resetScheduler: null, nowScheduler: null, latest: start, paused: null };
                }
                if (this._state.paused !== null) {
                    this._state.offset = start - this._state.paused;
                    this._state.paused = null;
                }
                this._schedule(start, end, this._state);
            });
            if (this._state === null) {
                stopScheduler();
            }
            else {
                this._state.stopScheduler = stopScheduler;
                this._state.resetScheduler = resetScheduler;
                this._state.nowScheduler = nowScheduler;
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
        if (state.endedTracks === this._json.tracks.length && start >= state.latest) {
            this._stop(state);
        }
    }
    _stop(state) {
        const { resolve, stopScheduler } = state;
        stopScheduler === null || stopScheduler === void 0 ? void 0 : stopScheduler();
        this._state = null;
        resolve();
    }
    static _isEndOfTrack(event) {
        return 'endOfTrack' in event;
    }
}
//# sourceMappingURL=midi-player.js.map