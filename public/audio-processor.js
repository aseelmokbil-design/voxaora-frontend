/**
 * VOXAORA AudioWorkletProcessor
 * Downsamples browser audio (any sampleRate) → 16 kHz mono PCM-16
 * and posts Int16Array buffers to the main thread for WebSocket streaming.
 */
class AudioProcessor extends AudioWorkletProcessor {
  process(inputs) {
    const ch = inputs[0]?.[0];
    if (!ch || ch.length === 0) return true;

    const ratio  = sampleRate / 16000;
    const outLen = Math.floor(ch.length / ratio);
    const pcm    = new Int16Array(outLen);

    for (let i = 0; i < outLen; i++) {
      const srcIdx = Math.min(Math.floor(i * ratio), ch.length - 1);
      const s      = Math.max(-1, Math.min(1, ch[srcIdx]));
      pcm[i]       = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }

    // transfer ownership so no copy occurs
    this.port.postMessage(pcm.buffer, [pcm.buffer]);
    return true;
  }
}

registerProcessor("audio-processor", AudioProcessor);
