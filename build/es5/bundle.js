(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('worker-timers'), require('midi-file-slicer'), require('@babel/runtime/helpers/defineProperty'), require('json-midi-message-encoder'), require('@babel/runtime/helpers/classCallCheck'), require('@babel/runtime/helpers/createClass')) :
    typeof define === 'function' && define.amd ? define(['exports', 'worker-timers', 'midi-file-slicer', '@babel/runtime/helpers/defineProperty', 'json-midi-message-encoder', '@babel/runtime/helpers/classCallCheck', '@babel/runtime/helpers/createClass'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.midiPlayer = {}, global.workerTimers, global.midiFileSlicer, global._defineProperty, global.jsonMidiMessageEncoder, global._classCallCheck, global._createClass));
})(this, (function (exports, workerTimers, midiFileSlicer, _defineProperty, jsonMidiMessageEncoder, _classCallCheck, _createClass) { 'use strict';

    var createMidiFileSlicer = function createMidiFileSlicer(json) {
      return new midiFileSlicer.MidiFileSlicer({
        json: json
      });
    };

    var encodeMidiMessage = function encodeMidiMessage(event) {
      return new Uint8Array(jsonMidiMessageEncoder.encode(event));
    };

    exports.PlayerState = void 0;
    (function (PlayerState) {
      PlayerState[PlayerState["Stopped"] = 0] = "Stopped";
      PlayerState[PlayerState["Playing"] = 1] = "Playing";
      PlayerState[PlayerState["Paused"] = 2] = "Paused";
    })(exports.PlayerState || (exports.PlayerState = {}));

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
          startScheduler = _ref.startScheduler;
        _classCallCheck(this, MidiPlayer);
        this._encodeMidiMessage = encodeMidiMessage;
        this._filterMidiMessage = filterMidiMessage;
        this._midiFileSlicer = midiFileSlicer;
        this._midiOutput = midiOutput;
        this._startScheduler = startScheduler;
        this._state = null;
        this._velocity = 1;
        this._latest = MidiPlayer._getMaxTimestamp(json);
      }
      return _createClass(MidiPlayer, [{
        key: "position",
        get: function get() {
          // STOPPED: Position is undefined.
          if (this.state === exports.PlayerState.Stopped) {
            return undefined;
          }
          var state = this._state;
          // PAUSED: Position of pause offset in real-time space.
          if (state.paused !== null) {
            return state.paused * this._velocity;
          }
          // PLAYING: Currrent offset in real-time space.
          var nowScheduler = state.nowScheduler;
          return (nowScheduler() - state.offset) * this._velocity;
        },
        set: function set(position) {
          var _a;
          // STOPPED: Exception.
          if (this.state === exports.PlayerState.Stopped) {
            throw new Error('The player is currently stopped.');
          }
          // No change, do nothing.
          if (Math.abs(position - this.position) < Number.EPSILON) {
            return;
          }
          // Whatever comes next, stop current notes.
          this._clear();
          var state = this._state;
          // PAUSED: Reposition pause offset in velocity space.
          // Decrement by small value to ensure current events are not missed.
          if (this.state === exports.PlayerState.Paused) {
            state.paused = position / this._velocity - 1;
          }
          // PLAYING: Reposition playing offset in velocity space.
          // Reset the scheduler instantaneously.
          else if (this.state === exports.PlayerState.Playing) {
            var nowScheduler = state.nowScheduler;
            state.offset = nowScheduler() - position / this._velocity;
            (_a = state.resetScheduler) === null || _a === void 0 ? void 0 : _a.call(state);
          }
        }
      }, {
        key: "state",
        get: function get() {
          if (this._state === null) {
            return exports.PlayerState.Stopped;
          }
          if (this._state.paused !== null) {
            return exports.PlayerState.Paused;
          }
          return exports.PlayerState.Playing;
        }
      }, {
        key: "velocity",
        get: function get() {
          // STOPPED: Velocity is undefined.
          if (this.state === exports.PlayerState.Stopped) {
            return undefined;
          }
          // PAUSED: Velocity is 0.
          if (this.state === exports.PlayerState.Paused) {
            return 0;
          }
          return this._velocity;
        },
        set: function set(velocity) {
          var _a;
          // STOPPED: Exception.
          if (this.state === exports.PlayerState.Stopped) {
            throw new Error('The player is currently stopped.');
          }
          // No change, do nothing.
          if (Math.abs(velocity - this._velocity) < Number.EPSILON) {
            return;
          }
          // Whatever comes next, stop current notes.
          this._clear();
          var state = this._state;
          // PAUSED: If v > 0, reposition paused offset in new velocity space.
          if (this.state === exports.PlayerState.Paused) {
            if (Math.abs(velocity) > Number.EPSILON) {
              state.paused = this.position / velocity;
              this._velocity = velocity;
            }
          }
          // PLAYING: If v > 0, reposition playing offset in new velocity space.
          //          If v == 0, pause (without saving v to remember current velocity).
          else if (this.state === exports.PlayerState.Playing) {
            if (Math.abs(velocity) > Number.EPSILON) {
              var nowScheduler = state.nowScheduler;
              state.offset = nowScheduler() - this.position / velocity;
              this._velocity = velocity;
              (_a = state.resetScheduler) === null || _a === void 0 ? void 0 : _a.call(state);
            } else {
              this._pause(this._state);
            }
          }
        }
      }, {
        key: "pause",
        value: function pause() {
          if (this.state !== exports.PlayerState.Playing) {
            throw new Error('The player is not currently playing.');
          }
          this._clear();
          this._pause(this._state);
        }
      }, {
        key: "play",
        value: function play(velocity) {
          if (this.state !== exports.PlayerState.Stopped) {
            throw new Error('The player is not currently stopped.');
          }
          // Here, we set the internal variable because we're already stopped and no further state adjustment is needed.
          if (typeof velocity !== 'undefined') {
            this._velocity = velocity;
          }
          return this._promise();
        }
      }, {
        key: "resume",
        value: function resume(velocity) {
          if (this.state !== exports.PlayerState.Paused) {
            throw new Error('The player is not currently paused.');
          }
          // Here, we set the public variable to adjust internal state.
          if (typeof velocity !== 'undefined') {
            this.velocity = velocity;
          }
          return this._promise();
        }
      }, {
        key: "stop",
        value: function stop() {
          if (this.state === exports.PlayerState.Stopped) {
            throw new Error('The player is already stopped.');
          }
          this._clear();
          this._stop(this._state);
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
        /* tslint:disable-next-line prefer-function-over-method */
      }, {
        key: "_pause",
        value: function _pause(state) {
          var resolve = state.resolve,
            stopScheduler = state.stopScheduler;
          stopScheduler === null || stopScheduler === void 0 ? void 0 : stopScheduler();
          var nowScheduler = state.nowScheduler;
          state.paused = nowScheduler() - state.offset;
          resolve();
        }
      }, {
        key: "_promise",
        value: function _promise() {
          var _this2 = this;
          return new Promise(function (resolve) {
            var _this2$_startSchedule = _this2._startScheduler(function (_ref2) {
                var end = _ref2.end,
                  start = _ref2.start;
                if (_this2._state === null) {
                  _this2._state = {
                    offset: start,
                    resolve: resolve,
                    stopScheduler: null,
                    resetScheduler: null,
                    nowScheduler: null,
                    paused: null
                  };
                }
                if (_this2._state.paused !== null) {
                  _this2._state.offset = start - _this2._state.paused;
                  _this2._state.paused = null;
                }
                _this2._schedule(start, end, _this2._state);
              }),
              stopScheduler = _this2$_startSchedule.stop,
              resetScheduler = _this2$_startSchedule.reset,
              nowScheduler = _this2$_startSchedule.now;
            if (_this2._state === null) {
              stopScheduler();
            } else {
              _this2._state.stopScheduler = stopScheduler;
              _this2._state.resetScheduler = resetScheduler;
              _this2._state.nowScheduler = nowScheduler;
            }
          });
        }
      }, {
        key: "_schedule",
        value: function _schedule(start, end, state) {
          var _this3 = this;
          var events = this._midiFileSlicer.slice((start - state.offset) * this._velocity, (end - state.offset) * this._velocity);
          events.filter(function (_ref3) {
            var event = _ref3.event;
            return _this3._filterMidiMessage(event);
          }).forEach(function (_ref4) {
            var event = _ref4.event,
              time = _ref4.time;
            return _this3._midiOutput.send(_this3._encodeMidiMessage(event), start + time / _this3._velocity);
          });
          if ((start - state.offset) * this._velocity >= this._latest) {
            this._stop(state);
          }
        }
      }, {
        key: "_stop",
        value: function _stop(state) {
          var resolve = state.resolve,
            stopScheduler = state.stopScheduler;
          stopScheduler === null || stopScheduler === void 0 ? void 0 : stopScheduler();
          this._state = null;
          resolve();
        }
      }], [{
        key: "_getMaxTimestamp",
        value: function _getMaxTimestamp(json) {
          // Collect all tempo changes.
          var tempoChanges = [];
          json.tracks.forEach(function (events) {
            var trackTime = 0;
            events.forEach(function (event) {
              trackTime += event.delta;
              if ('setTempo' in event) {
                tempoChanges.push({
                  time: trackTime,
                  tempo: event.setTempo.microsecondsPerQuarter
                });
              }
            });
          });
          // Sort tempo changes by time.
          tempoChanges.sort(function (a, b) {
            return a.time - b.time;
          });
          // Function to get the current tempo at a given time.
          function getTempoAtTime(time) {
            for (var i = tempoChanges.length - 1; i >= 0; i -= 1) {
              if (time >= tempoChanges[i].time) {
                return tempoChanges[i].tempo;
              }
            }
            return 500000; // Default tempo if no changes before this time
          }
          // Calculate the maximum timestamp considering all tracks and tempo changes.
          var maxTimestamp = 0;
          json.tracks.forEach(function (events) {
            var trackTime = 0;
            events.forEach(function (event) {
              trackTime += event.delta;
              var currentTempo = getTempoAtTime(trackTime);
              var currentTime = trackTime * (currentTempo / 1000) / json.division;
              if (currentTime > maxTimestamp) {
                maxTimestamp = currentTime;
              }
            });
          });
          return maxTimestamp;
        }
      }]);
    }();

    function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
    function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), !0).forEach(function (r) { _defineProperty(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
    var createMidiPlayerFactory = function createMidiPlayerFactory(createMidiFileSlicer, startScheduler) {
      return function (options) {
        var midiFileSlicer = createMidiFileSlicer(options.json);
        return new MidiPlayer(_objectSpread(_objectSpread({
          filterMidiMessage: function filterMidiMessage(event) {
            return 'controlChange' in event || 'noteOff' in event || 'noteOn' in event || 'programChange' in event;
          }
        }, options), {}, {
          encodeMidiMessage: encodeMidiMessage,
          midiFileSlicer: midiFileSlicer,
          startScheduler: startScheduler
        }));
      };
    };

    var INTERVAL = 500;
    var createStartScheduler = function createStartScheduler(clearInterval, performance, setInterval) {
      return function (next) {
        var start = performance.now();
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
          now: function now() {
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
            clearInterval(intervalId);
          }
        };
      };
    };

    var createMidiPlayer = createMidiPlayerFactory(createMidiFileSlicer, createStartScheduler(workerTimers.clearInterval, performance, workerTimers.setInterval));
    var create = function create(options) {
      return createMidiPlayer(options);
    };

    exports.create = create;

}));
