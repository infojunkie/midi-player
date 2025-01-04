const ALL_SOUND_OFF_EVENT_DATA = Array.from({ length: 16 }, (_, index) => new Uint8Array([176 + index, 120, 0]));
export class MidiPlayer {
    constructor({ encodeMidiMessage, filterMidiMessage, json, midiFileSlicer, midiOutput, startIntervalScheduler, startTimeoutScheduler }) {
        this._encodeMidiMessage = encodeMidiMessage;
        this._filterMidiMessage = filterMidiMessage;
        this._json = json;
        this._midiFileSlicer = midiFileSlicer;
        this._midiOutput = midiOutput;
        this._startIntervalScheduler = startIntervalScheduler;
        this._startTimeoutScheduler = startTimeoutScheduler;
        this._state = null;
        this._velocity = 1;
        this._repeat = 1;
    }
    /*
        public set position(position: number) {
            // STOPPED: Exception.
            if (this.state === PlayerState.Stopped) {
                throw new Error('The player is currently stopped.');
            }
    
            // No change, do nothing.
            if (Math.abs(position - (this.position as number)) < Number.EPSILON) {
                return;
            }
    
            // Whatever comes next, stop current notes.
            this._clear();
    
            const state = this._state as IState;
            // PAUSED: Reposition pause offset in velocity space.
            // Decrement by small value to ensure current events are not missed.
            if (this.state === PlayerState.Paused) {
                state.paused = position / this._velocity - 1;
            }
            // PLAYING: Reposition playing offset in velocity space.
            // Reset the scheduler instantaneously.
            else if (this.state === PlayerState.Playing) {
                const nowScheduler = state.nowScheduler as (() => number);
    
                state.offset = nowScheduler() - position / this._velocity;
    
                state.resetScheduler?.();
            }
        }
    
        public set velocity(velocity: number) {
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
    
            const state = this._state as IState;
            // PAUSED: If v > 0, reposition paused offset in new velocity space.
            if (this.state === PlayerState.Paused) {
                if (Math.abs(velocity) > Number.EPSILON) {
                    state.paused = (this.position as number) / velocity;
    
                    this._velocity = velocity;
                }
            }
            // PLAYING: If v > 0, reposition playing offset in new velocity space.
            //          If v == 0, pause (without saving v to remember current velocity).
            else if (this.state === PlayerState.Playing) {
                if (Math.abs(velocity) > Number.EPSILON) {
                    const nowScheduler = state.nowScheduler as (() => number);
    
                    state.offset = nowScheduler() - (this.position as number) / velocity;
    
                    this._velocity = velocity;
    
                    state.resetScheduler?.();
                }
                else {
                    this._pause(this._state as IState);
                }
            }
        }
    
        private _promise(): Promise<void> {
            return new Promise((resolve) => {
                const { stop: stopScheduler, reset: resetScheduler, now: nowScheduler } = this._startScheduler(({ end, start }) => {
                    if (this._state === null) {
                        this._state = {
                            next: null,
                            nowScheduler: null,
                            offset: start,
                            paused: null,
                            repeat: this._repeat,
                            resetScheduler: null,
                            resolve,
                            stopScheduler: null,
                        };
                    }
                    if (this._state.paused !== null) {
                        this._state.offset = start - this._state.paused;
                        this._state.paused = null;
                        this._state.resolve = resolve;
                    }
                    if (this._state.next !== null) {
                        this._state.offset = this._state.next;
                        this._state.next = null;
                    }
                    this._schedule(start, end, this._state);
                });
    
                if (this._state === null) {
                    stopScheduler();
                } else {
                    this._state.stopScheduler = stopScheduler;
                    this._state.resetScheduler = resetScheduler;
                    this._state.nowScheduler = nowScheduler;
                }
            });
        }
    
        private _schedule(start: number, end: number, state: IState): void {
            const events = this._midiFileSlicer.slice(
                (start - state.offset) * this._velocity,
                (end - state.offset) * this._velocity,
            );
    
            events
                .filter(({ event }) => this._filterMidiMessage(event))
                .forEach(({ event, time }) => this._midiOutput.send(this._encodeMidiMessage(event), start + time / this._velocity));
    
            // Check if we're at the end of the file.
            const wrapping = (end - state.offset) * this._velocity - this._latest;
            if (state.repeat === 0) {
                // If we're no longer looping, stop the player.
                if (state.nowScheduler !== null && (state.nowScheduler() - state.offset) * this._velocity >= this._latest) {
                    this._stop(state);
                }
            }
            else if (wrapping >= 0) {
                // Decrement the loop counter.
                if (state.repeat > 0) {
                    state.repeat -= 1;
                }
                // If we're still looping, schedule the starting events from the next cycle.
                // Otherwise, wait until next cycle to stop the player.
                if (state.repeat !== 0) {
                    const events2 = this._midiFileSlicer.slice(0, wrapping);
    
                    events2
                        .filter(({ event }) => this._filterMidiMessage(event))
                        .forEach(({ event, time }) => this._midiOutput.send(this._encodeMidiMessage(event), end + (time - wrapping) / this._velocity));
    
                    state.next = state.offset + this._latest / this._velocity;
                }
            }
        }
    */
    get position() {
        return this._state === null
            ? 0
            : this._state.peekScheduler === null
                ? this._state.offset
                : this._state.peekScheduler() - this._state.offset;
    }
    get state() {
        return this._state === null ? 'stopped' : this._state.peekScheduler === null ? 'paused' : 'playing';
    }
    get velocity() {
        return this._velocity;
    }
    pause() {
        if (this._state === null || this._state.peekScheduler === null) {
            throw new Error('The player is not playing.');
        }
        this._clear();
        const { endOfTrackEventTimes, resolve, peekScheduler, stopScheduler } = this._state;
        const positionWithOffset = peekScheduler();
        this._state = {
            ...this._state,
            endOfTrackEventTimes: endOfTrackEventTimes.filter((time) => time < positionWithOffset),
            offset: positionWithOffset - this._state.offset,
            peekScheduler: null,
            stopScheduler: null
        };
        stopScheduler();
        resolve();
    }
    play(velocity, repeat) {
        if (this._state !== null) {
            throw new Error('The player is not stopped.');
        }
        // Here, we set the internal variable because we're already stopped and no further state adjustment is needed.
        if (typeof velocity !== 'undefined') {
            this._velocity = velocity;
        }
        if (typeof repeat !== 'undefined') {
            this._repeat = repeat;
        }
        return this._schedule([], 0);
    }
    resume(velocity, repeat) {
        if (this._state === null || this._state.peekScheduler !== null) {
            throw new Error('The player is not paused.');
        }
        const { endOfTrackEventTimes, offset } = this._state;
        this._state = null;
        // FIXME Here, we set the public variable to adjust internal state.
        if (typeof velocity !== 'undefined') {
            this._velocity = velocity;
        }
        if (typeof repeat !== 'undefined') {
            this._repeat = repeat;
        }
        return this._schedule(endOfTrackEventTimes, offset);
    }
    stop() {
        if (this._state === null) {
            throw new Error('The player is already stopped.');
        }
        if (this._state.stopScheduler === null) {
            this._state = null;
        }
        else {
            this._clear();
            this._stop(this._state);
        }
    }
    _clear() {
        var _a, _b;
        // Bug #1: Chrome does not yet implement the clear() method.
        (_b = (_a = this._midiOutput).clear) === null || _b === void 0 ? void 0 : _b.call(_a);
        ALL_SOUND_OFF_EVENT_DATA.forEach((data) => this._midiOutput.send(data));
    }
    _schedule(endOfTrackEventTimes, offset) {
        return new Promise((resolve) => {
            var _a;
            const { peek: peekScheduler, stop: stopScheduler } = this._startIntervalScheduler(({ end, start }) => {
                var _a, _b, _c, _d, _e;
                if (this._state === null) {
                    this._state = { endOfTrackEventTimes, offset: start - offset, resolve, peekScheduler: null, stopScheduler: null };
                }
                const events = this._midiFileSlicer.slice((start - this._state.offset) * this._velocity, (end - this._state.offset) * this._velocity);
                events
                    .filter(({ event }) => this._filterMidiMessage(event))
                    .forEach(({ event, time }) => this._midiOutput.send(this._encodeMidiMessage(event), start + time / this._velocity));
                const newEndOfTrackEventTimes = events
                    .filter(({ event }) => MidiPlayer._isEndOfTrack(event))
                    .map(({ time }) => start + time / this._velocity);
                this._state.endOfTrackEventTimes.push(...newEndOfTrackEventTimes);
                console.log(this._repeat);
                if (this._state.endOfTrackEventTimes.length === this._json.tracks.length) {
                    const timeout = Math.max(...newEndOfTrackEventTimes) - ((_c = (_b = (_a = this._state).peekScheduler) === null || _b === void 0 ? void 0 : _b.call(_a)) !== null && _c !== void 0 ? _c : start);
                    if (timeout > 0) {
                        (_e = (_d = this._state).stopScheduler) === null || _e === void 0 ? void 0 : _e.call(_d);
                        this._state = {
                            ...this._state,
                            stopScheduler: this._startTimeoutScheduler(() => {
                                this._state = null;
                                resolve();
                            }, timeout)
                        };
                    }
                    else {
                        this._stop(this._state);
                    }
                }
            });
            if (((_a = this._state) === null || _a === void 0 ? void 0 : _a.stopScheduler) === null) {
                this._state = { ...this._state, peekScheduler, stopScheduler };
            }
            else {
                stopScheduler();
                if (this._state !== null) {
                    this._state = { ...this._state, peekScheduler };
                }
            }
        });
    }
    _stop({ resolve, stopScheduler }) {
        this._state = null;
        stopScheduler === null || stopScheduler === void 0 ? void 0 : stopScheduler();
        resolve();
    }
    static _isEndOfTrack(event) {
        return 'endOfTrack' in event;
    }
}
//# sourceMappingURL=midi-player.js.map