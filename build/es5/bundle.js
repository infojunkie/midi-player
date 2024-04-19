(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('worker-timers'), require('midi-file-slicer'), require('@babel/runtime/helpers/defineProperty'), require('json-midi-message-encoder'), require('@babel/runtime/helpers/classCallCheck'), require('@babel/runtime/helpers/createClass'), require('rxjs')) :
    typeof define === 'function' && define.amd ? define(['exports', 'worker-timers', 'midi-file-slicer', '@babel/runtime/helpers/defineProperty', 'json-midi-message-encoder', '@babel/runtime/helpers/classCallCheck', '@babel/runtime/helpers/createClass', 'rxjs'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.midiPlayer = {}, global.workerTimers, global.midiFileSlicer, global._defineProperty, global.jsonMidiMessageEncoder, global._classCallCheck, global._createClass, global.rxjs));
})(this, (function (exports, workerTimers, midiFileSlicer, _defineProperty, jsonMidiMessageEncoder, _classCallCheck, _createClass, rxjs) { 'use strict';

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
          scheduler = _ref.scheduler;
        _classCallCheck(this, MidiPlayer);
        this._encodeMidiMessage = encodeMidiMessage;
        this._filterMidiMessage = filterMidiMessage;
        this._json = json;
        this._midiFileSlicer = midiFileSlicer;
        this._midiOutput = midiOutput;
        this._scheduler = scheduler;
        this._state = null;
      }
      return _createClass(MidiPlayer, [{
        key: "position",
        get: function get() {
          return this._state === null ? null : this._scheduler.now() - this._state.offset;
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
        value: function play() {
          if (this.state !== exports.PlayerState.Stopped) {
            throw new Error('The player is not currently stopped.');
          }
          return this._promise();
        }
      }, {
        key: "resume",
        value: function resume() {
          if (this.state !== exports.PlayerState.Paused) {
            throw new Error('The player is not currently paused.');
          }
          return this._promise();
        }
      }, {
        key: "seek",
        value: function seek(position) {
          if (this.state === exports.PlayerState.Stopped) {
            throw new Error('The player is currently stopped.');
          }
          this._clear();
          if (this.state === exports.PlayerState.Paused) {
            this._state.paused = position;
          } else if (this.state === exports.PlayerState.Playing) {
            var now = this._scheduler.now();
            this._state.offset = now - position;
            this._scheduler.reset(now);
          }
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
      }, {
        key: "_pause",
        value: function _pause(state) {
          var resolve = state.resolve,
            schedulerSubscription = state.schedulerSubscription;
          schedulerSubscription === null || schedulerSubscription === void 0 ? void 0 : schedulerSubscription.unsubscribe();
          state.paused = this._scheduler.now() - state.offset;
          resolve();
        }
      }, {
        key: "_promise",
        value: function _promise() {
          var _this2 = this;
          return new Promise(function (resolve, reject) {
            var schedulerSubscription = _this2._scheduler.subscribe({
              error: function error(err) {
                return reject(err);
              },
              next: function next(_ref2) {
                var end = _ref2.end,
                  start = _ref2.start;
                if (_this2._state === null) {
                  _this2._state = {
                    endedTracks: 0,
                    offset: start,
                    resolve: resolve,
                    schedulerSubscription: null,
                    latest: start,
                    paused: null
                  };
                }
                if (_this2._state.paused !== null) {
                  _this2._state.offset = _this2._scheduler.now() - _this2._state.paused;
                  _this2._state.paused = null;
                }
                _this2._schedule(start, end, _this2._state);
              }
            });
            if (_this2._state === null) {
              schedulerSubscription.unsubscribe();
            } else {
              _this2._state.schedulerSubscription = schedulerSubscription;
            }
          });
        }
      }, {
        key: "_schedule",
        value: function _schedule(start, end, state) {
          var _this3 = this;
          var events = this._midiFileSlicer.slice(start - state.offset, end - state.offset);
          events.filter(function (_ref3) {
            var event = _ref3.event;
            return _this3._filterMidiMessage(event);
          }).forEach(function (_ref4) {
            var event = _ref4.event,
              time = _ref4.time;
            _this3._midiOutput.send(_this3._encodeMidiMessage(event), start + time);
            state.latest = Math.max(state.latest, start + time);
          });
          var endedTracks = events.filter(function (_ref5) {
            var event = _ref5.event;
            return MidiPlayer._isEndOfTrack(event);
          }).length;
          state.endedTracks += endedTracks;
          if (state.endedTracks === this._json.tracks.length && state.latest !== null && this._scheduler.now() >= state.latest) {
            this._stop(state);
          }
        }
      }, {
        key: "_stop",
        value: function _stop(state) {
          var resolve = state.resolve,
            schedulerSubscription = state.schedulerSubscription;
          schedulerSubscription === null || schedulerSubscription === void 0 ? void 0 : schedulerSubscription.unsubscribe();
          this._state = null;
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
      return _createClass(Scheduler, [{
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
    }();

    exports.MidiControllerMessage = void 0;
    (function (MidiControllerMessage) {
      MidiControllerMessage[MidiControllerMessage["BankSelect_Coarse"] = 0] = "BankSelect_Coarse";
      MidiControllerMessage[MidiControllerMessage["ModulationWheel_Coarse"] = 1] = "ModulationWheel_Coarse";
      MidiControllerMessage[MidiControllerMessage["BreathController_Coarse"] = 2] = "BreathController_Coarse";
      MidiControllerMessage[MidiControllerMessage["FootController_Coarse"] = 3] = "FootController_Coarse";
      MidiControllerMessage[MidiControllerMessage["PortamentoTime_Coarse"] = 4] = "PortamentoTime_Coarse";
      MidiControllerMessage[MidiControllerMessage["DataEntry_Coarse"] = 5] = "DataEntry_Coarse";
      MidiControllerMessage[MidiControllerMessage["ChannelVolume_Coarse"] = 6] = "ChannelVolume_Coarse";
      MidiControllerMessage[MidiControllerMessage["Balance_Coarse"] = 7] = "Balance_Coarse";
      MidiControllerMessage[MidiControllerMessage["Pan_Coarse"] = 10] = "Pan_Coarse";
      MidiControllerMessage[MidiControllerMessage["Expression_Coarse"] = 11] = "Expression_Coarse";
      MidiControllerMessage[MidiControllerMessage["EffectControl1_Coarse"] = 12] = "EffectControl1_Coarse";
      MidiControllerMessage[MidiControllerMessage["EffectControl2_Coarse"] = 13] = "EffectControl2_Coarse";
      MidiControllerMessage[MidiControllerMessage["GeneralPurposeController1"] = 16] = "GeneralPurposeController1";
      MidiControllerMessage[MidiControllerMessage["GeneralPurposeController2"] = 17] = "GeneralPurposeController2";
      MidiControllerMessage[MidiControllerMessage["GeneralPurposeController3"] = 18] = "GeneralPurposeController3";
      MidiControllerMessage[MidiControllerMessage["GeneralPurposeController4"] = 19] = "GeneralPurposeController4";
      MidiControllerMessage[MidiControllerMessage["BankSelect_Fine"] = 32] = "BankSelect_Fine";
      MidiControllerMessage[MidiControllerMessage["ModulationWheel_Fine"] = 33] = "ModulationWheel_Fine";
      MidiControllerMessage[MidiControllerMessage["BreathController_Fine"] = 34] = "BreathController_Fine";
      MidiControllerMessage[MidiControllerMessage["FootController_Fine"] = 36] = "FootController_Fine";
      MidiControllerMessage[MidiControllerMessage["PortamentoTime_Fine"] = 37] = "PortamentoTime_Fine";
      MidiControllerMessage[MidiControllerMessage["DataEntry_Fine"] = 38] = "DataEntry_Fine";
      MidiControllerMessage[MidiControllerMessage["ChannelVolume_Fine"] = 39] = "ChannelVolume_Fine";
      MidiControllerMessage[MidiControllerMessage["Balance_Fine"] = 40] = "Balance_Fine";
      MidiControllerMessage[MidiControllerMessage["Pan_Fine"] = 42] = "Pan_Fine";
      MidiControllerMessage[MidiControllerMessage["Expression_Fine"] = 43] = "Expression_Fine";
      MidiControllerMessage[MidiControllerMessage["EffectControl1_Fine"] = 44] = "EffectControl1_Fine";
      MidiControllerMessage[MidiControllerMessage["EffectControl2_Fine"] = 45] = "EffectControl2_Fine";
      MidiControllerMessage[MidiControllerMessage["HoldPedal1_OnOff"] = 64] = "HoldPedal1_OnOff";
      MidiControllerMessage[MidiControllerMessage["PortamentoPedal_OnOff"] = 65] = "PortamentoPedal_OnOff";
      MidiControllerMessage[MidiControllerMessage["SostenutoPedal_OnOff"] = 66] = "SostenutoPedal_OnOff";
      MidiControllerMessage[MidiControllerMessage["SoftPedal_OnOff"] = 67] = "SoftPedal_OnOff";
      MidiControllerMessage[MidiControllerMessage["LegatoPedal_OnOff"] = 68] = "LegatoPedal_OnOff";
      MidiControllerMessage[MidiControllerMessage["HoldPedal2_OnOff"] = 69] = "HoldPedal2_OnOff";
      MidiControllerMessage[MidiControllerMessage["SoundController1"] = 70] = "SoundController1";
      MidiControllerMessage[MidiControllerMessage["SoundController2"] = 71] = "SoundController2";
      MidiControllerMessage[MidiControllerMessage["SoundController3"] = 72] = "SoundController3";
      MidiControllerMessage[MidiControllerMessage["SoundController4"] = 73] = "SoundController4";
      MidiControllerMessage[MidiControllerMessage["SoundController5"] = 74] = "SoundController5";
      MidiControllerMessage[MidiControllerMessage["SoundController6"] = 75] = "SoundController6";
      MidiControllerMessage[MidiControllerMessage["SoundController7"] = 76] = "SoundController7";
      MidiControllerMessage[MidiControllerMessage["SoundController8"] = 77] = "SoundController8";
      MidiControllerMessage[MidiControllerMessage["SoundController9"] = 78] = "SoundController9";
      MidiControllerMessage[MidiControllerMessage["SoundController10"] = 79] = "SoundController10";
      MidiControllerMessage[MidiControllerMessage["GeneralPurposeController5"] = 80] = "GeneralPurposeController5";
      MidiControllerMessage[MidiControllerMessage["GeneralPurposeController6"] = 81] = "GeneralPurposeController6";
      MidiControllerMessage[MidiControllerMessage["GeneralPurposeController7"] = 82] = "GeneralPurposeController7";
      MidiControllerMessage[MidiControllerMessage["GeneralPurposeController8"] = 83] = "GeneralPurposeController8";
      MidiControllerMessage[MidiControllerMessage["PortamentoControl"] = 84] = "PortamentoControl";
      MidiControllerMessage[MidiControllerMessage["HighResolutionVelocityPrefix"] = 88] = "HighResolutionVelocityPrefix";
      MidiControllerMessage[MidiControllerMessage["Effect1Depth"] = 91] = "Effect1Depth";
      MidiControllerMessage[MidiControllerMessage["Effect2Depth"] = 92] = "Effect2Depth";
      MidiControllerMessage[MidiControllerMessage["Effect3Depth"] = 93] = "Effect3Depth";
      MidiControllerMessage[MidiControllerMessage["Effect4Depth"] = 94] = "Effect4Depth";
      MidiControllerMessage[MidiControllerMessage["Effect5Depth"] = 95] = "Effect5Depth";
      MidiControllerMessage[MidiControllerMessage["DataButtonIncrement"] = 96] = "DataButtonIncrement";
      MidiControllerMessage[MidiControllerMessage["DataButtonDecrement"] = 97] = "DataButtonDecrement";
      MidiControllerMessage[MidiControllerMessage["NonRegisteredParameter_Coarse"] = 98] = "NonRegisteredParameter_Coarse";
      MidiControllerMessage[MidiControllerMessage["NonRegisteredParameter_Fine"] = 99] = "NonRegisteredParameter_Fine";
      MidiControllerMessage[MidiControllerMessage["RegisteredParameter_Coarse"] = 100] = "RegisteredParameter_Coarse";
      MidiControllerMessage[MidiControllerMessage["RegisteredParameter_Fine"] = 101] = "RegisteredParameter_Fine";
      MidiControllerMessage[MidiControllerMessage["AllSoundOff"] = 120] = "AllSoundOff";
      MidiControllerMessage[MidiControllerMessage["AllControllersOff"] = 121] = "AllControllersOff";
      MidiControllerMessage[MidiControllerMessage["LocalControl_OnOff"] = 122] = "LocalControl_OnOff";
      MidiControllerMessage[MidiControllerMessage["AllNotesOff"] = 123] = "AllNotesOff";
      MidiControllerMessage[MidiControllerMessage["OmniModeOff"] = 124] = "OmniModeOff";
      MidiControllerMessage[MidiControllerMessage["OmniModeOn"] = 125] = "OmniModeOn";
      MidiControllerMessage[MidiControllerMessage["PolyModeOff"] = 126] = "PolyModeOff";
      MidiControllerMessage[MidiControllerMessage["PolyModeOn"] = 127] = "PolyModeOn";
    })(exports.MidiControllerMessage || (exports.MidiControllerMessage = {}));

    exports.MidiRegisteredParameterNumber = void 0;
    (function (MidiRegisteredParameterNumber) {
      MidiRegisteredParameterNumber[MidiRegisteredParameterNumber["PitchBendRange"] = 0] = "PitchBendRange";
      MidiRegisteredParameterNumber[MidiRegisteredParameterNumber["FineTuning"] = 1] = "FineTuning";
      MidiRegisteredParameterNumber[MidiRegisteredParameterNumber["CoarseTuning"] = 2] = "CoarseTuning";
      MidiRegisteredParameterNumber[MidiRegisteredParameterNumber["TuningProgramChange"] = 3] = "TuningProgramChange";
      MidiRegisteredParameterNumber[MidiRegisteredParameterNumber["TuningBankSelect"] = 4] = "TuningBankSelect";
      MidiRegisteredParameterNumber[MidiRegisteredParameterNumber["ModulationDepthRange"] = 5] = "ModulationDepthRange";
      MidiRegisteredParameterNumber[MidiRegisteredParameterNumber["MidiPolyphonicExpressionConfiguration"] = 6] = "MidiPolyphonicExpressionConfiguration";
    })(exports.MidiRegisteredParameterNumber || (exports.MidiRegisteredParameterNumber = {}));

    var scheduler = new Scheduler(workerTimers.clearInterval, performance, workerTimers.setInterval);
    var createMidiPlayer = createMidiPlayerFactory(createMidiFileSlicer, scheduler);
    var create = function create(options) {
      return createMidiPlayer(options);
    };

    exports.create = create;

}));
