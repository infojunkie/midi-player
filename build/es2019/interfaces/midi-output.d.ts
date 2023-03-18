export interface IMidiOutput {
    clear?(): void;
    send(data: number[] | Uint8Array, timestamp?: number): void;
}
//# sourceMappingURL=midi-output.d.ts.map