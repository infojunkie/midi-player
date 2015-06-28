'use strict';

var di = require('di'),
    EventEmitter = require('events').EventEmitter,
    Performance = require('./injector/performance.js'),
    WorkerTimers = require('./injector/worker-timers.js');

const INTERVAL = 0.5;

class Scheduler extends EventEmitter {

    constructor (performance, workerTimers) {
        super();

        this._lookaheadWithOffset = (performance.now() / 1000) + (INTERVAL * 2);
        this._performance = performance;

        workerTimers.setInterval(::this._advance, INTERVAL * 1000);
    }

    get currentTime () {
        return this._performance.now() / 1000;
    }

    get lookahead () {
        return this._lookaheadWithOffset;
    }

    _advance () {
        let previousLookahead = this._lookaheadWithOffset;

        this._lookaheadWithOffset += INTERVAL;

        this.emit('advanced', previousLookahead, this._lookaheadWithOffset);
    }

}

di.annotate(Scheduler, new di.Inject(Performance, WorkerTimers));

module.exports.Scheduler = Scheduler;
