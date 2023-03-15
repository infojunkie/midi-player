import { IMidiFile } from 'midi-json-parser-worker';
import { MidiFileSlicer } from '../midi-file-slicer';

export type TMidiFileSlicerFactory = (json: IMidiFile) => MidiFileSlicer;
