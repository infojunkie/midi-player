(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('worker-timers'), require('midi-file-slicer'), require('@babel/runtime/helpers/defineProperty'), require('json-midi-message-encoder'), require('@babel/runtime/helpers/toConsumableArray'), require('@babel/runtime/helpers/classCallCheck'), require('@babel/runtime/helpers/createClass'), require('rxjs')) :
    typeof define === 'function' && define.amd ? define(['exports', 'worker-timers', 'midi-file-slicer', '@babel/runtime/helpers/defineProperty', 'json-midi-message-encoder', '@babel/runtime/helpers/toConsumableArray', '@babel/runtime/helpers/classCallCheck', '@babel/runtime/helpers/createClass', 'rxjs'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.midiPlayer = {}, global.workerTimers, global.midiFileSlicer, global._defineProperty, global.jsonMidiMessageEncoder, global._toConsumableArray, global._classCallCheck, global._createClass, global.rxjs));
})(this, (function (exports, workerTimers, midiFileSlicer, _defineProperty, jsonMidiMessageEncoder, _toConsumableArray, _classCallCheck, _createClass, rxjs) { 'use strict';

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

    var MidiPlayer = /*#__PURE__*/function () {
      function MidiPlayer(_ref) {
        var encodeMidiMessage = _ref.encodeMidiMessage,
          filterMidiMessage = _ref.filterMidiMessage,
          json = _ref.json,
          midiFileSlicer = _ref.midiFileSlicer,
          midiOutput = _ref.midiOutput,
          scheduler = _ref.scheduler;
        _classCallCheck(this, MidiPlayer);
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
      _createClass(MidiPlayer, [{
        key: "position",
        get: function get() {
          return this._offset === null ? null : this._scheduler.now() - this._offset;
        }
      }, {
        key: "state",
        get: function get() {
          if (this._schedulerSubscription === null && this._resolve === null) {
            return this._endedTracks === null ? exports.PlayerState.Stopped : exports.PlayerState.Paused;
          }
          return exports.PlayerState.Playing;
        }
      }, {
        key: "pause",
        value: function pause() {
          if (this.state !== exports.PlayerState.Playing) {
            throw new Error('The player is not currently playing.');
          }
          this._pause();
          if (this._offset !== null) {
            this._offset = this._scheduler.now() - this._offset;
          }
        }
      }, {
        key: "play",
        value: function play() {
          if (this.state === exports.PlayerState.Playing) {
            throw new Error('The player is currently playing.');
          }
          this._endedTracks = 0;
          if (this._offset !== null) {
            this._offset = this._scheduler.now() - this._offset;
          }
          return this._promise();
        }
      }, {
        key: "resume",
        value: function resume() {
          if (this.state !== exports.PlayerState.Paused) {
            throw new Error('The player is not currently paused.');
          }
          if (this._offset !== null) {
            this._offset = this._scheduler.now() - this._offset;
          }
          return this._promise();
        }
      }, {
        key: "seek",
        value: function seek(position) {
          this._clear();
          if (this.state !== exports.PlayerState.Playing) {
            this._offset = position;
          } else {
            var now = this._scheduler.now();
            this._offset = now - position;
            this._scheduler.reset(now);
          }
        }
      }, {
        key: "stop",
        value: function stop() {
          this._pause();
          this._offset = null;
          this._endedTracks = null;
        }
      }, {
        key: "_clear",
        value: function _clear() {
          var _this = this;
          var _a, _b;
          (_b = (_a = this._midiOutput).clear) === null || _b === void 0 ? void 0 : _b.call(_a);
          // Send AllSoundOff message to all channels.
          _toConsumableArray(Array(16).keys()).map(function (n) {
            return n + 1;
          }).forEach(function (channel) {
            var allSoundOff = _this._encodeMidiMessage({
              channel: channel,
              controlChange: {
                type: 120,
                value: 127
              }
            });
            if (_this._latest !== null) {
              _this._midiOutput.send(allSoundOff, _this._latest);
            }
          });
        }
      }, {
        key: "_pause",
        value: function _pause() {
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
      }, {
        key: "_promise",
        value: function _promise() {
          var _this2 = this;
          return new Promise(function (resolve, reject) {
            _this2._resolve = resolve;
            _this2._schedulerSubscription = _this2._scheduler.subscribe({
              error: function error(err) {
                return reject(err);
              },
              next: function next(_ref2) {
                var end = _ref2.end,
                  start = _ref2.start;
                if (_this2._offset === null) {
                  _this2._offset = start;
                }
                if (_this2._latest === null) {
                  _this2._latest = start;
                }
                _this2._schedule(start, end);
              }
            });
            if (_this2._resolve === null) {
              _this2._schedulerSubscription.unsubscribe();
            }
          });
        }
      }, {
        key: "_schedule",
        value: function _schedule(start, end) {
          var _this3 = this;
          if (this._endedTracks === null || this._offset === null || this._resolve === null) {
            throw new Error('The player is in an unexpected state.');
          }
          var events = this._midiFileSlicer.slice(start - this._offset, end - this._offset);
          events.filter(function (_ref3) {
            var event = _ref3.event;
            return _this3._filterMidiMessage(event);
          }).forEach(function (_ref4) {
            var event = _ref4.event,
              time = _ref4.time;
            _this3._midiOutput.send(_this3._encodeMidiMessage(event), start + time);
            /* tslint:disable-next-line no-non-null-assertion */
            _this3._latest = Math.max(_this3._latest, start + time);
          });
          var endedTracks = events.filter(function (_ref5) {
            var event = _ref5.event;
            return MidiPlayer._isEndOfTrack(event);
          }).length;
          this._endedTracks += endedTracks;
          if (this._endedTracks === this._json.tracks.length && this._latest !== null && this._scheduler.now() >= this._latest) {
            this.stop();
          }
        }
      }], [{
        key: "_isEndOfTrack",
        value: function _isEndOfTrack(event) {
          return 'endOfTrack' in event;
        }
      }]);
      return MidiPlayer;
    }();

    function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); enumerableOnly && (symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; })), keys.push.apply(keys, symbols); } return keys; }
    function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = null != arguments[i] ? arguments[i] : {}; i % 2 ? ownKeys(Object(source), !0).forEach(function (key) { _defineProperty(target, key, source[key]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } return target; }
    var createMidiPlayerFactory = function createMidiPlayerFactory(createMidiFileSlicer, scheduler) {
      return function (options) {
        var midiFileSlicer = createMidiFileSlicer(options.json);
        return new MidiPlayer(_objectSpread(_objectSpread({
          filterMidiMessage: function filterMidiMessage(event) {
            return 'controlChange' in event || 'noteOff' in event || 'noteOn' in event || 'programChange' in event;
          }
        }, options), {}, {
          encodeMidiMessage: encodeMidiMessage,
          midiFileSlicer: midiFileSlicer,
          scheduler: scheduler
        }));
      };
    };

    var INTERVAL = 500;
    var Scheduler = /*#__PURE__*/function () {
      function Scheduler(_clearInterval, _performance, _setInterval) {
        _classCallCheck(this, Scheduler);
        this._clearInterval = _clearInterval;
        this._performance = _performance;
        this._setInterval = _setInterval;
        this._intervalId = null;
        this._nextTick = 0;
        this._numberOfSubscribers = 0;
        this._subject = new rxjs.Subject();
      }
      _createClass(Scheduler, [{
        key: "now",
        value: function now() {
          return this._performance.now();
        }
      }, {
        key: "reset",
        value: function reset(currentTime) {
          this._nextTick = currentTime;
          this._subject.next({
            end: this._nextTick + INTERVAL,
            start: this._nextTick
          });
        }
      }, {
        key: "subscribe",
        value: function subscribe(observer) {
          var _this = this;
          this._numberOfSubscribers += 1;
          var currentTime = this._performance.now();
          if (this._numberOfSubscribers === 1) {
            this._start(currentTime);
          }
          // tslint:disable-next-line:deprecation
          var subscription = rxjs.merge(rxjs.of({
            end: this._nextTick + INTERVAL,
            start: currentTime
          }), this._subject).subscribe(observer);
          var unsubscribe = function unsubscribe() {
            _this._numberOfSubscribers -= 1;
            if (_this._numberOfSubscribers === 0) {
              _this._stop();
            }
            return subscription.unsubscribe();
          };
          return {
            unsubscribe: unsubscribe
          };
        }
      }, {
        key: "_start",
        value: function _start(currentTime) {
          var _this2 = this;
          this._nextTick = currentTime + INTERVAL;
          this._intervalId = this._setInterval(function () {
            if (_this2._performance.now() >= _this2._nextTick) {
              _this2._nextTick += INTERVAL;
              _this2._subject.next({
                end: _this2._nextTick + INTERVAL,
                start: _this2._nextTick
              });
            }
          }, INTERVAL / 10);
        }
      }, {
        key: "_stop",
        value: function _stop() {
          if (this._intervalId !== null) {
            this._clearInterval(this._intervalId);
          }
          this._intervalId = null;
        }
      }]);
      return Scheduler;
    }();

    var scheduler = new Scheduler(workerTimers.clearInterval, performance, workerTimers.setInterval);
    var createMidiPlayer = createMidiPlayerFactory(createMidiFileSlicer, scheduler);
    var create = function create(options) {
      return createMidiPlayer(options);
    };

    exports.create = create;

}));
