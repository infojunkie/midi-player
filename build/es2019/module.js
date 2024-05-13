import { clearInterval, setInterval } from 'worker-timers';
import { createMidiFileSlicer } from './factories/midi-file-slicer';
import { createMidiPlayerFactory } from './factories/midi-player-factory';
import { createStartScheduler } from './factories/start-scheduler';
/*
 * @todo Explicitly referencing the barrel file seems to be necessary when enabling the
 * isolatedModules compiler option.
 */
export * from './interfaces/index';
export * from './types/index';
const createMidiPlayer = createMidiPlayerFactory(createMidiFileSlicer, createStartScheduler(clearInterval, performance, setInterval));
export const create = (options) => createMidiPlayer(options);
//# sourceMappingURL=module.js.map