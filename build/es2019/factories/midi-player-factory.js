import { encodeMidiMessage } from '../helpers/encode-midi-message';
import { MidiPlayer } from '../midi-player';
export const createMidiPlayerFactory = (createMidiFileSlicer, startIntervalScheduler, startTimeoutScheduler) => {
    return (options) => {
        const midiFileSlicer = createMidiFileSlicer(options.json);
        return new MidiPlayer({
            filterMidiMessage: (event) => 'channel' in event,
            ...options,
            encodeMidiMessage,
            midiFileSlicer,
            startIntervalScheduler,
            startTimeoutScheduler
        });
    };
};
//# sourceMappingURL=midi-player-factory.js.map