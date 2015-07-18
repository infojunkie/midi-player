'use strict';

var di = require('di'),
    MidiFileSlicerFactoryMock = require('../mock/midi-file-slicer-factory.js').MidiFileSlicerFactoryMock,
    MidiMessageEncoderMock = require('../mock/midi-message-encoder.js').MidiMessageEncoderMock,
    midiPlayerInjector = require('../../src/midi-player.js').midiPlayerInjector,
    SchedulerMock = require('../mock/scheduler.js').SchedulerMock;

describe('MidiPlayer', function () {

    var midiFileSlicerFactory,
        midiMessageEncoder,
        midiPlayer,
        MidiPlayer,
        scheduler;

    beforeEach(function () {
        var injector = new di.Injector([
                MidiFileSlicerFactoryMock,
                MidiMessageEncoderMock,
                SchedulerMock
            ]);

        midiFileSlicerFactory = injector.get(MidiFileSlicerFactoryMock);
        midiMessageEncoder = injector.get(MidiMessageEncoderMock);
        MidiPlayer = injector.get(midiPlayerInjector);
        scheduler = injector.get(SchedulerMock);
    });

    describe('constructor', function () {

        it('should initialize the MidiFileSlicerFactory', function () {
            var json = 'a fake midi representation';

            midiPlayer = new MidiPlayer({
                json: json
            });

            expect(midiFileSlicerFactory.create).to.have.been.calledOnce;
            expect(midiFileSlicerFactory.create).to.have.been.calledWithExactly({
                json: json
            });
        });

    });

    describe('play()', function () {

        it('should schedule all events up to the lookahead', function () {
            var event,
                json,
                midiFileSlicer,
                midiOutput,
                sequence;

            event = {
                noteOn: 'a fake note on event',
                time: 0.5
            };

            json = {
                tracks: [
                    'a fake track'
                ]
            };

            midiOutput = {
                send: sinon.stub()
            };

            midiPlayer = new MidiPlayer({
                json: json,
                midiOutput: midiOutput
            });

            sequence = 'a fake sequence';

            midiFileSlicer = midiFileSlicerFactory.midiFileSlicers[0];
            midiFileSlicer.slice.returns([
                event
            ]);

            midiMessageEncoder.encode.returns(sequence);

            scheduler.currentTime = 0.2;
            scheduler.lookahead = 1;

            midiPlayer.play();

            expect(midiFileSlicer.slice).to.have.been.calledOnce;
            expect(midiFileSlicer.slice).to.have.been.calledWithExactly(0, 0.8);

            expect(midiMessageEncoder.encode).to.have.been.calledOnce;
            expect(midiMessageEncoder.encode).to.have.been.calledWithExactly(event);

            expect(midiOutput.send).to.have.been.calledOnce;
            expect(midiOutput.send).to.have.been.calledWithExactly(sequence, 700);
        });

    });

});
