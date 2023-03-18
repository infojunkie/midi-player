import { encode } from 'json-midi-message-encoder';
export const encodeMidiMessage = (event) => {
    return new Uint8Array(encode(event));
};
//# sourceMappingURL=encode-midi-message.js.map