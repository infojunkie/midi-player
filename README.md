# midi-player

**A MIDI player which sends MIDI messages to connected devices.**

This module provides a player which sends MIDI messages to connected devices. It schedules the messages with a look ahead of about 500 milliseconds. It does not directly rely on the [Web MIDI API](https://webaudio.github.io/web-midi-api/) but expects a [MIDIOutput](https://webaudio.github.io/web-midi-api/#midioutput-interface) to be passed as constructor argument. But theoretically that could be anything which implements the same interface.

## Features of this fork
This is a fork of the original [`midi-player` module by Chris Guttandin](https://github.com/chrisguttandin/midi-player). I decided to fork it instead of attempting to merge back the changes into the upstream because I am adding features outside the scope that Chris had envisioned for the module. Nothing prevents such a merge to happen in the future, given we find enough time to integrate the codebases. In the meantime, I do my best to keep this fork updated with the latest upstream changes, and to contribute to the core functionality that Chris maintains.

Here are the features added in this fork:
- ~~Add support for [MIDIOutput.clear()](https://developer.mozilla.org/en-US/docs/Web/API/MIDIOutput/clear) for browsers that implement it~~ MERGED :tada:
- ~~Add method `IMidiPlayer.stop()`~~ MERGED :tada:
- Add attribute `IMidiPlayer.state`
- Add methods `IMidiPlayer.pause()`, `IMidiPlayer.resume()` WIP at https://github.com/chrisguttandin/midi-player/issues/361 :construction:
- Add attribute `IMidiPlayer.position`
- Add method `IMidiPlayer.seek(position)`
- ~~Send [MIDI Control Change (CC) message "All Sound Off"](https://anotherproducer.com/online-tools-for-musicians/midi-cc-list/) on player pause/stop~~ MERGED :tada:

The version numbering used in this fork is `<major>.<minor>.<patch>-<upstream-major>.<upstream-minor>.<upstream-patch>`.

## Usage

```shell
npm install git://github.com/infojunkie/midi-player.git#infojunkie
```

The only exported function is a factory method to create new player instances.

```js
import { create } from 'midi-player';

// This is a JSON object which represents a MIDI file.
const json = {
    division: 480,
    format: 1,
    tracks: [
        { channel: 0, delta: 0, noteOn: { noteNumber: 36, velocity: 100 } },
        { channel: 0, delta: 240, noteOff: { noteNumber: 36, velocity: 64 } },
        { delta: 0, endOfTrack: true }
    ]
};

// This is a quick & dirty approach to grab the first known MIDI output.
const midiAccess = await navigator.requestMIDIAccess();
const midiOutput = Array.from(midiAccess.outputs)[0];

const midiPlayer = create({ json, midiOutput });

// All MIDI messages have been sent when the promise returned by play() resolves.
await midiPlayer.play();
```

By default only control change, note off, note on and program change events will be sent. But it's possible to provide a custom filter function. The following player will only send note off and note on events.

```js
const midiPlayer = create({
    filterMidiMessage: (event) => 'noteOff' in event || 'noteOn' in event
    // ... other options as described above
});
```

If you want to play a binary MIDI file you can use the [midi-json-parser](https://github.com/chrisguttandin/midi-json-parser) package to transform it into a compatible JSON representation.
