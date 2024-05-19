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
        this._velocity = 1;
    }
    get position() {
        // STOPPED: Position is undefined.
        if (this.state === PlayerState.Stopped) {
            return undefined;
        }
        const state = this._state;
        // PAUSED: Position of pause offset in real-time space.
        if (state.paused !== null) {
            return state.paused * this._velocity;
        }
        // PLAYING: Currrent offset in real-time space.
        const nowScheduler = state.nowScheduler;
        return (nowScheduler() - state.offset) * this._velocity;
    }
    set position(position) {
        var _a;
        // STOPPED: Exception.
        if (this.state === PlayerState.Stopped) {
            throw new Error('The player is currently stopped.');
        }
        // No change, do nothing.
        if (Math.abs(position - this.position) < Number.EPSILON) {
            return;
        }
        // Whatever comes next, stop current notes.
        this._clear();
        const state = this._state;
        // PAUSED: Reposition pause offset in velocity space.
        // Decrement by small value to ensure current events are not missed.
        if (this.state === PlayerState.Paused) {
            state.paused = position / this._velocity - 1;
        }
        // PLAYING: Reposition playing offset in velocity space.
        // Reset the scheduler instantaneously.
        else if (this.state === PlayerState.Playing) {
            const nowScheduler = state.nowScheduler;
            state.offset = nowScheduler() - position / this._velocity;
            (_a = state.resetScheduler) === null || _a === void 0 ? void 0 : _a.call(state);
        }
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
    get velocity() {
        // STOPPED: Velocity is undefined.
        if (this.state === PlayerState.Stopped) {
            return undefined;
        }
        // PAUSED: Velocity is 0.
        if (this.state === PlayerState.Paused) {
            return 0;
        }
        return this._velocity;
    }
    set velocity(velocity) {
        var _a;
        // STOPPED: Exception.
        if (this.state === PlayerState.Stopped) {
            throw new Error('The player is currently stopped.');
        }
        // No change, do nothing.
        if (Math.abs(velocity - this._velocity) < Number.EPSILON) {
            return;
        }
        // Whatever comes next, stop current notes.
        this._clear();
        const state = this._state;
        // PAUSED: If v > 0, reposition paused offset in new velocity space.
        if (this.state === PlayerState.Paused) {
            if (Math.abs(velocity) > Number.EPSILON) {
                state.paused = this.position / velocity;
                this._velocity = velocity;
            }
        }
        // PLAYING: If v > 0, reposition playing offset in new velocity space.
        //          If v == 0, pause (without saving v to remember current velocity).
        else if (this.state === PlayerState.Playing) {
            if (Math.abs(velocity) > Number.EPSILON) {
                const nowScheduler = state.nowScheduler;
                state.offset = nowScheduler() - this.position / velocity;
                this._velocity = velocity;
                (_a = state.resetScheduler) === null || _a === void 0 ? void 0 : _a.call(state);
            }
            else {
                this._pause(this._state);
            }
        }
    }
    pause() {
        if (this.state !== PlayerState.Playing) {
            throw new Error('The player is not currently playing.');
        }
        this._clear();
        this._pause(this._state);
    }
    play(velocity = 1) {
        if (this.state !== PlayerState.Stopped) {
            throw new Error('The player is not currently stopped.');
        }
        // Set internal variable only because we are currently stopped.
        this._velocity = velocity;
        return this._promise();
    }
    resume(velocity = 1) {
        if (this.state !== PlayerState.Paused) {
            throw new Error('The player is not currently paused.');
        }
        // Set public variable to adjust internal state.
        this.velocity = velocity;
        return this._promise();
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
    /* tslint:disable-next-line prefer-function-over-method */
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
        const events = this._midiFileSlicer.slice((start - state.offset) * this._velocity, (end - state.offset) * this._velocity);
        events
            .filter(({ event }) => this._filterMidiMessage(event))
            .forEach(({ event, time }) => {
            const timestamp = start + time / this._velocity;
            this._midiOutput.send(this._encodeMidiMessage(event), timestamp);
            state.latest = Math.max(state.latest, timestamp);
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