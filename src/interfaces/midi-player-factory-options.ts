import { IMidiFile, TMidiEvent } from 'midi-json-parser-worker';
import { IMidiOutput } from './midi-output';

export interface IMidiPlayerFactoryOptions {
    json: IMidiFile;

    midiOutput: IMidiOutput;

    isSendableEvent?(event: TMidiEvent): boolean;
}
