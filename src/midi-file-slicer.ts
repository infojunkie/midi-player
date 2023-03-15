import { IMidiFile, IMidiSetTempoEvent, TMidiEvent } from 'midi-json-parser-worker';

export interface ITimedMidiEvent {
    event: TMidiEvent;

    time: number;
}

export class MidiFileSlicer {
    private _json: IMidiFile;

    private _microsecondsPerQuarter: { microsecondsPerQuarter: number, offset: number }[];

    constructor({ json }: { json: IMidiFile }) {
        this._json = json;
        this._microsecondsPerQuarter = [{ microsecondsPerQuarter: 500000, offset: 0 }];

        this._gatherMicrosecondsPerQuarter();
    }

    public slice(start: number, end: number): ITimedMidiEvent[] {
        const events: ITimedMidiEvent[] = [];

        const tracks = this._json.tracks;

        const length = tracks.length;

        for (let i = 0; i < length; i += 1) {
            let offset = 0;

            let time = 0;

            const track = tracks[i];

            const lngth = track.length;

            for (let j = 0; j < lngth; j += 1) {
                const event = track[j];

                offset += event.delta;

                const microsecondsPerQuarter = this._findMicrosecondsPerQuarter(offset);

                time += event.delta * (microsecondsPerQuarter / this._json.division / 1000);

                if (time >= start && time < end) {
                    events.push({ event, time: time - start });
                }

                if (offset >= end) {
                    break;
                }
            }
        }

        return events;
    }

    private _findMicrosecondsPerQuarter(offset: number): number {
        return this._microsecondsPerQuarter.find(event => event.offset <= offset)?.microsecondsPerQuarter ?? 500000;
    }

    private _gatherMicrosecondsPerQuarter(): void {
        const tracks = this._json.tracks;

        const length = tracks.length;

        for (let i = 0; i < length; i += 1) {
            let offset = 0;

            const track = tracks[i];

            const lngth = track.length;

            for (let j = 0; j < lngth; j += 1) {
                const event = track[j];

                offset += event.delta;

                if (MidiFileSlicer._isIMidiSetTempoEvent(event)) {
                    this._microsecondsPerQuarter.unshift({
                        microsecondsPerQuarter: event.setTempo.microsecondsPerQuarter,
                        offset
                    });
                }
            }
        }
    }

    private static _isIMidiSetTempoEvent(event: TMidiEvent): event is IMidiSetTempoEvent {
        return (<IMidiSetTempoEvent>event).setTempo !== undefined;
    }
}