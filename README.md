# midi-player

**A MIDI player which sends MIDI messages to connected devices.**

This module provides a player which sends MIDI messages to connected devices. It schedules the messages with a look ahead of about 500 milliseconds. It does not directly rely on the [Web MIDI API](https://webaudio.github.io/web-midi-api/) but expects a [MIDIOutput](https://webaudio.github.io/web-midi-api/#midioutput-interface) to be passed as constructor argument. But theoretically that could be anything which implements the same interface.

## Features of this fork
This is a fork of the original [`midi-player` module by Chris Guttandin](https://github.com/chrisguttandin/midi-player). I decided to fork it instead of attempting to merge back the changes into the upstream because I am adding features outside the scope that Chris had envisioned for the module. Nothing prevents such a merge to happen in the future, given we find enough time to integrate the codebases. In the meantime, I do my best to keep this fork updated with the latest upstream changes, and to contribute to the core functionality that Chris maintains.

Here are the features added in this fork:
- ~~Add support for [MIDIOutput.clear()](https://developer.mozilla.org/en-US/docs/Web/API/MIDIOutput/clear) for browsers that implement it~~ MERGED :tada:
- ~~Add method `IMidiPlayer.stop()`~~ MERGED :tada:
- ~~Send [MIDI Control Change (CC) message "All Sound Off"](https://anotherproducer.com/online-tools-for-musicians/midi-cc-list/) on player pause/stop~~ MERGED :tada:
- ~~Add methods `IMidiPlayer.pause()`, `IMidiPlayer.resume()`~~ IMPLEMENTED :tada:
- ~~Add read-only attribute `IMidiPlayer.state` (stopped, playing, paused)~~ IMPLEMENTED :tada:
- Respect MIDI file duration before resolving the playback promise -- WIP at https://github.com/chrisguttandin/midi-player/issues/362
- Fix bug with playback promise for `IMidiPlayer.pause()` and `IMidiPlayer.resume()` -- WIP at https://github.com/chrisguttandin/midi-player/issues/364
- Support real-time cursor repositioning via attribute `IMidiPlayer.position`
- Support real-time playback rate / velocity adjustment via attribute `IMidiPlayer.velocity` and arguments `IMidiPlayer.play(velocity?)`, `IMidiPlayer.resume(velocity?)`
- Support looping via arguments `IMidiPlayer.play(repeat?)`, `IMidiPlayer.resume(repeat?)`

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
```

By default all status events will be sent. But it's possible to provide a custom filter function. The following player will only send note off and note on events.

```js
const midiPlayer = create({
    filterMidiMessage: (event) => 'noteOff' in event || 'noteOn' in event
    // ... other options as described above
});
```

If you want to play a binary MIDI file you can use the [midi-json-parser](https://github.com/chrisguttandin/midi-json-parser) package to transform it into a compatible JSON representation.

### position

The `position` is set to the current `position` in milliseconds.

```js
midiPlayer.position;
```

### state

The `state` property will either be set to `'paused'`, `'playing'`, or `'stopped'`.

```js
midiPlayer.state;
```

### play()

Calling `play()` will initiate the playback from the start.

```js
midiPlayer.play().then(() => {
    // All MIDI messages have been sent when the promise returned by play() resolves.
});
```

It can only be called when the `state` of the player is `'stopped'`.

### pause()

Calling `pause()` will pause the playback at the current `position`.

```js
midiPlayer.pause();
```

It can only be called when the `state` of the player is `'playing'`.

### resume()

Calling `resume()` will resume a previously paused playback at the current `position`.

```js
midiPlayer.resume().then(() => {
    // All MIDI messages have been sent when the promise returned by resume() resolves.
});
```

It can only be called when the `state` of the player is `'paused'`.

### stop()

Calling `stop()` will stop the player.

```js
midiPlayer.stop();
```

It can only be called when the `state` of the player is not `'stopped'`.

## Acknowledgement

Most of the features of this package have been originally developed by [@infojunkie](https://github.com/infojunkie) who maintains a midi-player fork ([infojunkie/midi-player](https://github.com/infojunkie/midi-player)) with even more functionality.
