import { PlayerState } from './types/player-state';
const ALL_SOUND_OFF_EVENT_DATA = Array.from({ length: 16 }, (_, index) => new Uint8Array([176 + index, 120, 0]));
export class MidiPlayer {
    constructor({ encodeMidiMessage, filterMidiMessage, json, midiFileSlicer, midiOutput, startScheduler }) {
        this._encodeMidiMessage = encodeMidiMessage;
        this._filterMidiMessage = filterMidiMessage;
        this._midiFileSlicer = midiFileSlicer;
        this._midiOutput = midiOutput;
        this._startScheduler = startScheduler;
        this._state = null;
        this._velocity = 1;
        this._latest = MidiPlayer._getMaxTimestamp(json);
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
    play(velocity) {
        if (this.state !== PlayerState.Stopped) {
            throw new Error('The player is not currently stopped.');
        }
        // Here, we set the internal variable because we're already stopped and no further state adjustment is needed.
        if (typeof velocity !== 'undefined') {
            this._velocity = velocity;
        }
        return this._promise();
    }
    resume(velocity) {
        if (this.state !== PlayerState.Paused) {
            throw new Error('The player is not currently paused.');
        }
        // Here, we set the public variable to adjust internal state.
        if (typeof velocity !== 'undefined') {
            this.velocity = velocity;
        }
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
                    this._state = { offset: start, resolve, stopScheduler: null, resetScheduler: null, nowScheduler: null, paused: null };
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
            .forEach(({ event, time }) => this._midiOutput.send(this._encodeMidiMessage(event), start + time / this._velocity));
        if ((start - state.offset) * this._velocity >= this._latest) {
            this._stop(state);
        }
    }
    _stop(state) {
        const { resolve, stopScheduler } = state;
        stopScheduler === null || stopScheduler === void 0 ? void 0 : stopScheduler();
        this._state = null;
        resolve();
    }
    static _getMaxTimestamp(json) {
        // Collect all tempo changes.
        const tempoChanges = [];
        json.tracks.forEach(events => {
            let trackTime = 0;
            events.forEach((event) => {
                trackTime += event.delta;
                if ('setTempo' in event) {
                    tempoChanges.push({ time: trackTime, tempo: event.setTempo.microsecondsPerQuarter });
                }
            });
        });
        // Sort tempo changes by time.
        tempoChanges.sort((a, b) => a.time - b.time);
        // Function to get the current tempo at a given time.
        function getTempoAtTime(time) {
            for (let i = tempoChanges.length - 1; i >= 0; i -= 1) {
                if (time >= tempoChanges[i].time) {
                    return tempoChanges[i].tempo;
                }
            }
            return 500000; // Default tempo if no changes before this time
        }
        // Calculate the maximum timestamp considering all tracks and tempo changes.
        let maxTimestamp = 0;
        json.tracks.forEach(events => {
            let trackTime = 0;
            events.forEach(event => {
                trackTime += event.delta;
                const currentTempo = getTempoAtTime(trackTime);
                const currentTime = trackTime * (currentTempo / 1000) / json.division;
                if (currentTime > maxTimestamp) {
                    maxTimestamp = currentTime;
                }
            });
        });
        return maxTimestamp;
    }
}
//# sourceMappingURL=midi-player.js.map