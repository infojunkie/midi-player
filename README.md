# midi-player

**A MIDI player which sends MIDI messages to connected devices.**

[![version](https://img.shields.io/npm/v/midi-player.svg?style=flat-square)](https://www.npmjs.com/package/midi-player)

This module provides a player which sends MIDI messages to connected devices. It schedules the messages with a look ahead of about 500 milliseconds. It does not directly rely on the [Web MIDI API](https://webaudio.github.io/web-midi-api/) but expects a [MIDIOutput](https://webaudio.github.io/web-midi-api/#midioutput-interface) to be passed as constructor argument. But theoretically that could be anything which implements the same interface.

## Features of this fork
This is a fork of the original [`midi-player` module by Chris Guttandin](https://github.com/chrisguttandin/midi-player). I decided to fork it instead of attempting to merge back the changes into the original because I am adding features outside the scope that Chris had envisioned for the module. Nothing prevents such a merge to happen in the future, given we find enough time to integrate the codebases. In the meantime, I will do my best to keep this fork updated with the latest upstream changes.

Here are the features added in this fork:
- Support for [MIDIOutput.clear()](https://developer.mozilla.org/en-US/docs/Web/API/MIDIOutput/clear) for browsers that implement it
- Attributes `IMidiPlayer.state` and `IMidiPlayer.position`
- Methods `IMidiPlayer.pause()`, `IMidiPlayer.resume()`, `IMidiPlayer.stop()`, `IMidiPlayer.seek(position)`
- Sending [MIDI Control Change (CC) message "All Sound Off"](https://anotherproducer.com/online-tools-for-musicians/midi-cc-list/) on player pause/stop

## Usage

`midi-player` is published on [npm](https://www.npmjs.com/package/midi-player) and can be installed as usual.

```shell
npm install midi-player
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

If you want to play a binary MIDI file you can use the [midi-json-parser](https://github.com/chrisguttandin/midi-json-parser) package to transform it into a compatible JSON representation.
