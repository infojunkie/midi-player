(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('worker-timers'), require('midi-file-slicer'), require('@babel/runtime/helpers/defineProperty'), require('json-midi-message-encoder'), require('@babel/runtime/helpers/toConsumableArray'), require('@babel/runtime/helpers/classCallCheck'), require('@babel/runtime/helpers/createClass')) :
    typeof define === 'function' && define.amd ? define(['exports', 'worker-timers', 'midi-file-slicer', '@babel/runtime/helpers/defineProperty', 'json-midi-message-encoder', '@babel/runtime/helpers/toConsumableArray', '@babel/runtime/helpers/classCallCheck', '@babel/runtime/helpers/createClass'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.midiPlayer = {}, global.workerTimers, global.midiFileSlicer, global._defineProperty, global.jsonMidiMessageEncoder, global._toConsumableArray, global._classCallCheck, global._createClass));
})(this, (function (exports, workerTimers, midiFileSlicer, _defineProperty, jsonMidiMessageEncoder, _toConsumableArray, _classCallCheck, _createClass) { 'use strict';

    var createMidiFileSlicer = function createMidiFileSlicer(json) {
      return new midiFileSlicer.MidiFileSlicer({
        json: json
      });
    };

    var encodeMidiMessage = function encodeMidiMessage(event) {
      return new Uint8Array(jsonMidiMessageEncoder.encode(event));
    };

    function ownKeys$1(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
    function _objectSpread$1(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys$1(Object(t), !0).forEach(function (r) { _defineProperty(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys$1(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
    var ALL_SOUND_OFF_EVENT_DATA = Array.from({
      length: 16
    }, function (_, index) {
      return new Uint8Array([176 + index, 120, 0]);
    });
    var MidiPlayer = /*#__PURE__*/function () {
      function MidiPlayer(_ref) {
        var encodeMidiMessage = _ref.encodeMidiMessage,
          filterMidiMessage = _ref.filterMidiMessage,
          json = _ref.json,
          midiFileSlicer = _ref.midiFileSlicer,
          midiOutput = _ref.midiOutput,
          startIntervalScheduler = _ref.startIntervalScheduler,
          startTimeoutScheduler = _ref.startTimeoutScheduler;
        _classCallCheck(this, MidiPlayer);
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
      return _createClass(MidiPlayer, [{
        key: "position",
        get: function get() {
          return this._state === null ? 0 : this._state.peekScheduler === null ? this._state.offset : this._state.peekScheduler() - this._state.offset;
        }
      }, {
        key: "state",
        get: function get() {
          return this._state === null ? 'stopped' : this._state.peekScheduler === null ? 'paused' : 'playing';
        }
      }, {
        key: "velocity",
        get: function get() {
          return this._velocity;
        }
      }, {
        key: "pause",
        value: function pause() {
          if (this._state === null || this._state.peekScheduler === null) {
            throw new Error('The player is not playing.');
          }
          this._clear();
          var _this$_state = this._state,
            endOfTrackEventTimes = _this$_state.endOfTrackEventTimes,
            resolve = _this$_state.resolve,
            peekScheduler = _this$_state.peekScheduler,
            stopScheduler = _this$_state.stopScheduler;
          var positionWithOffset = peekScheduler();
          this._state = _objectSpread$1(_objectSpread$1({}, this._state), {}, {
            endOfTrackEventTimes: endOfTrackEventTimes.filter(function (time) {
              return time < positionWithOffset;
            }),
            offset: positionWithOffset - this._state.offset,
            peekScheduler: null,
            stopScheduler: null
          });
          stopScheduler();
          resolve();
        }
      }, {
        key: "play",
        value: function play(velocity, repeat) {
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
      }, {
        key: "resume",
        value: function resume(velocity, repeat) {
          if (this._state === null || this._state.peekScheduler !== null) {
            throw new Error('The player is not paused.');
          }
          var _this$_state2 = this._state,
            endOfTrackEventTimes = _this$_state2.endOfTrackEventTimes,
            offset = _this$_state2.offset;
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
      }, {
        key: "stop",
        value: function stop() {
          if (this._state === null) {
            throw new Error('The player is already stopped.');
          }
          if (this._state.stopScheduler === null) {
            this._state = null;
          } else {
            this._clear();
            this._stop(this._state);
          }
        }
      }, {
        key: "_clear",
        value: function _clear() {
          var _this = this;
          var _a, _b;
          // Bug #1: Chrome does not yet implement the clear() method.
          (_b = (_a = this._midiOutput).clear) === null || _b === void 0 ? void 0 : _b.call(_a);
          ALL_SOUND_OFF_EVENT_DATA.forEach(function (data) {
            return _this._midiOutput.send(data);
          });
        }
      }, {
        key: "_schedule",
        value: function _schedule(endOfTrackEventTimes, offset) {
          var _this2 = this;
          return new Promise(function (resolve) {
            var _a;
            var _this2$_startInterval = _this2._startIntervalScheduler(function (_ref2) {
                var _this2$_state$endOfTr;
                var end = _ref2.end,
                  start = _ref2.start;
                var _a, _b, _c, _d, _e;
                if (_this2._state === null) {
                  _this2._state = {
                    endOfTrackEventTimes: endOfTrackEventTimes,
                    offset: start - offset,
                    resolve: resolve,
                    peekScheduler: null,
                    stopScheduler: null
                  };
                }
                var events = _this2._midiFileSlicer.slice((start - _this2._state.offset) * _this2._velocity, (end - _this2._state.offset) * _this2._velocity);
                events.filter(function (_ref3) {
                  var event = _ref3.event;
                  return _this2._filterMidiMessage(event);
                }).forEach(function (_ref4) {
                  var event = _ref4.event,
                    time = _ref4.time;
                  return _this2._midiOutput.send(_this2._encodeMidiMessage(event), start + time / _this2._velocity);
                });
                var newEndOfTrackEventTimes = events.filter(function (_ref5) {
                  var event = _ref5.event;
                  return MidiPlayer._isEndOfTrack(event);
                }).map(function (_ref6) {
                  var time = _ref6.time;
                  return start + time / _this2._velocity;
                });
                (_this2$_state$endOfTr = _this2._state.endOfTrackEventTimes).push.apply(_this2$_state$endOfTr, _toConsumableArray(newEndOfTrackEventTimes));
                console.log(_this2._repeat);
                if (_this2._state.endOfTrackEventTimes.length === _this2._json.tracks.length) {
                  var timeout = Math.max.apply(Math, _toConsumableArray(newEndOfTrackEventTimes)) - ((_c = (_b = (_a = _this2._state).peekScheduler) === null || _b === void 0 ? void 0 : _b.call(_a)) !== null && _c !== void 0 ? _c : start);
                  if (timeout > 0) {
                    (_e = (_d = _this2._state).stopScheduler) === null || _e === void 0 ? void 0 : _e.call(_d);
                    _this2._state = _objectSpread$1(_objectSpread$1({}, _this2._state), {}, {
                      stopScheduler: _this2._startTimeoutScheduler(function () {
                        _this2._state = null;
                        resolve();
                      }, timeout)
                    });
                  } else {
                    _this2._stop(_this2._state);
                  }
                }
              }),
              peekScheduler = _this2$_startInterval.peek,
              stopScheduler = _this2$_startInterval.stop;
            if (((_a = _this2._state) === null || _a === void 0 ? void 0 : _a.stopScheduler) === null) {
              _this2._state = _objectSpread$1(_objectSpread$1({}, _this2._state), {}, {
                peekScheduler: peekScheduler,
                stopScheduler: stopScheduler
              });
            } else {
              stopScheduler();
              if (_this2._state !== null) {
                _this2._state = _objectSpread$1(_objectSpread$1({}, _this2._state), {}, {
                  peekScheduler: peekScheduler
                });
              }
            }
          });
        }
      }, {
        key: "_stop",
        value: function _stop(_ref7) {
          var resolve = _ref7.resolve,
            stopScheduler = _ref7.stopScheduler;
          this._state = null;
          stopScheduler === null || stopScheduler === void 0 ? void 0 : stopScheduler();
          resolve();
        }
      }], [{
        key: "_isEndOfTrack",
        value: function _isEndOfTrack(event) {
          return 'endOfTrack' in event;
        }
      }]);
    }();

    function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
    function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), !0).forEach(function (r) { _defineProperty(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
    var createMidiPlayerFactory = function createMidiPlayerFactory(createMidiFileSlicer, startIntervalScheduler, startTimeoutScheduler) {
      return function (options) {
        var midiFileSlicer = createMidiFileSlicer(options.json);
        return new MidiPlayer(_objectSpread(_objectSpread({
          filterMidiMessage: function filterMidiMessage(event) {
            return 'channel' in event;
          }
        }, options), {}, {
          encodeMidiMessage: encodeMidiMessage,
          midiFileSlicer: midiFileSlicer,
          startIntervalScheduler: startIntervalScheduler,
          startTimeoutScheduler: startTimeoutScheduler
        }));
      };
    };

    var INTERVAL = 500;
    var createStartIntervalScheduler = function createStartIntervalScheduler(clearInterval, performance, setInterval) {
      return function (next) {
        var start = performance.now();
        // FIXME Remove INTERVAL addition as per https://github.com/infojunkie/midi-player/commit/3246da9afd3cb2475d37e900a38c2755c4bcf519#diff-8a4bd800733f7c8acd7513b26f37baa32d954603b3c5a45e92741aa04a14bc45L341
        var nextTick = start + INTERVAL;
        var end = nextTick + INTERVAL;
        var intervalId = setInterval(function () {
          if (performance.now() >= nextTick) {
            nextTick = end;
            end += INTERVAL;
            next({
              end: end,
              start: nextTick
            });
          }
        }, INTERVAL / 10);
        next({
          end: end,
          start: start
        });
        return {
          peek: function peek() {
            return performance.now();
          },
          reset: function reset() {
            nextTick = performance.now() - INTERVAL;
            end = nextTick + INTERVAL;
            next({
              end: end,
              start: nextTick
            });
          },
          stop: function stop() {
            return clearInterval(intervalId);
          }
        };
      };
    };

    var createStartTimeoutScheduler = function createStartTimeoutScheduler(clearTimeout, setTimeout) {
      return function (handler, timeout) {
        var timeoutId = setTimeout(handler, timeout);
        return function () {
          return clearTimeout(timeoutId);
        };
      };
    };

    var createMidiPlayer = createMidiPlayerFactory(createMidiFileSlicer, createStartIntervalScheduler(workerTimers.clearInterval, performance, workerTimers.setInterval), createStartTimeoutScheduler(workerTimers.clearTimeout, workerTimers.setTimeout));
    var create = function create(options) {
      return createMidiPlayer(options);
    };

    exports.create = create;

}));
