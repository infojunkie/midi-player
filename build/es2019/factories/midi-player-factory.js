import { encodeMidiMessage } from '../helpers/encode-midi-message';
import { MidiPlayer } from '../midi-player';
export const createMidiPlayerFactory = (createMidiFileSlicer, startScheduler) => {
    return (options) => {
        const midiFileSlicer = createMidiFileSlicer(options.json);
        return new MidiPlayer({
            filterMidiMessage: (event) => 'controlChange' in event || 'noteOff' in event || 'noteOn' in event || 'programChange' in event,
            ...options,
            encodeMidiMessage,
            midiFileSlicer,
            startScheduler
        });
    };
};
//# sourceMappingURL=midi-player-factory.js.map