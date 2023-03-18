import { encodeMidiMessage } from '../helpers/encode-midi-message';
import { MidiPlayer } from '../midi-player';
export const createMidiPlayerFactory = (createMidiFileSlicer, scheduler) => {
    return (options) => {
        const midiFileSlicer = createMidiFileSlicer(options.json);
        return new MidiPlayer({ ...options, encodeMidiMessage, midiFileSlicer, scheduler });
    };
};
//# sourceMappingURL=midi-player-factory.js.map