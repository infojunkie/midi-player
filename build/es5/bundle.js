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
        this._json = json;
        this._midiFileSlicer = midiFileSlicer;
        this._midiOutput = midiOutput;
        this._startScheduler = startScheduler;
        this._state = null;
      }
      return _createClass(MidiPlayer, [{
        key: "position",
        get: function get() {
          if (this._state === null) {
            return null;
          }
          var nowScheduler = this._state.nowScheduler;
          return nowScheduler() - this._state.offset;
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
          var _a;
          if (this.state === exports.PlayerState.Stopped) {
            throw new Error('The player is currently stopped.');
          }
          this._clear();
          var state = this._state;
          if (this.state === exports.PlayerState.Paused) {
            state.paused = position - 1;
          } else if (this.state === exports.PlayerState.Playing) {
            var nowScheduler = state.nowScheduler;
            state.offset = nowScheduler() - position;
            (_a = state.resetScheduler) === null || _a === void 0 ? void 0 : _a.call(state);
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
                    endedTracks: 0,
                    offset: start,
                    resolve: resolve,
                    stopScheduler: null,
                    resetScheduler: null,
                    nowScheduler: null,
                    latest: start,
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
          if (state.endedTracks === this._json.tracks.length && start >= state.latest) {
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
        key: "_isEndOfTrack",
        value: function _isEndOfTrack(event) {
          return 'endOfTrack' in event;
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
            var start = performance.now();
            nextTick = start - INTERVAL;
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

    var createMidiPlayer = createMidiPlayerFactory(createMidiFileSlicer, createStartScheduler(workerTimers.clearInterval, performance, workerTimers.setInterval));
    var create = function create(options) {
      return createMidiPlayer(options);
    };

    exports.create = create;

}));
