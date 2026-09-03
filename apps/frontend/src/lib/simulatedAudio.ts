import type { SimulationResult } from '@acoustom/types';
import { apiUrl } from './api';

const sharedKey = 'acoustom-shared-simulated-audio';
const MAX_RENDER_SECONDS = 60;

function encodeWav(buffer: AudioBuffer): Blob {
  const frames = buffer.length;
  const bytes = 44 + frames * buffer.numberOfChannels * 2;
  const view = new DataView(new ArrayBuffer(bytes));
  const text = (offset: number, value: string) =>
    [...value].forEach((letter, index) => view.setUint8(offset + index, letter.charCodeAt(0)));
  text(0, 'RIFF');
  view.setUint32(4, bytes - 8, true);
  text(8, 'WAVE');
  text(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, buffer.numberOfChannels, true);
  view.setUint32(24, buffer.sampleRate, true);
  view.setUint32(28, buffer.sampleRate * buffer.numberOfChannels * 2, true);
  view.setUint16(32, buffer.numberOfChannels * 2, true);
  view.setUint16(34, 16, true);
  text(36, 'data');
  view.setUint32(40, bytes - 44, true);
  const channels = Array.from({ length: buffer.numberOfChannels }, (_, index) =>
    buffer.getChannelData(index)
  );
  let offset = 44;
  for (let frame = 0; frame < frames; frame += 1)
    for (const channel of channels) {
      const sample = Math.max(-1, Math.min(1, channel[frame] ?? 0));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  return new Blob([view], { type: 'audio/wav' });
}

export async function renderSimulatedWav(
  sourceFile: File,
  simulation: SimulationResult,
  gain = 1
): Promise<Blob> {
  const decodeContext = new AudioContext();
  try {
    const source = await decodeContext.decodeAudioData(await sourceFile.arrayBuffer());
    const responses = await Promise.all(
      [simulation.impulseResponses.left, simulation.impulseResponses.right].map(async (url) => {
        const response = await fetch(apiUrl(url), { cache: 'no-store' });
        if (!response.ok) throw new Error('Could not load the room impulse response.');
        return decodeContext.decodeAudioData(await response.arrayBuffer());
      })
    );
    const sourceFrames = Math.min(
      source.length,
      Math.floor(source.sampleRate * MAX_RENDER_SECONDS)
    );
    const length = sourceFrames + Math.max(...responses.map((response) => response.length));
    const offline = new OfflineAudioContext(2, length, source.sampleRate);
    const input = offline.createBufferSource();
    input.buffer = source;
    const merger = offline.createChannelMerger(2);
    responses.forEach((response, index) => {
      const convolver = offline.createConvolver();
      convolver.normalize = false;
      convolver.buffer = response;
      input.connect(convolver);
      convolver.connect(merger, 0, index);
    });
    const level = offline.createGain();
    level.gain.value = gain;
    merger.connect(level).connect(offline.destination);
    input.start(0, 0, sourceFrames / source.sampleRate);
    const rendered = await offline.startRendering();
    let peak = 0;
    for (let channel = 0; channel < rendered.numberOfChannels; channel += 1)
      for (const sample of rendered.getChannelData(channel))
        peak = Math.max(peak, Math.abs(sample));
    if (peak > 0.98)
      for (let channel = 0; channel < rendered.numberOfChannels; channel += 1) {
        const values = rendered.getChannelData(channel);
        for (let index = 0; index < values.length; index += 1) values[index] *= 0.98 / peak;
      }
    return encodeWav(rendered);
  } finally {
    await decodeContext.close();
  }
}

export async function shareSimulatedWav(
  audio: Blob,
  simulationId: string
): Promise<{ audioUrl: string; expiresAt: string; mimeType: string }> {
  const form = new FormData();
  form.set('audio', audio, `acoustom-${simulationId}.wav`);
  form.set('simulation_id', simulationId);
  form.set('consent', 'true');
  const response = await fetch(apiUrl('/api/simulation-audio'), { method: 'POST', body: form });
  if (!response.ok) throw new Error(`Could not share simulated audio (${response.status})`);
  const asset = (await response.json()) as {
    audioUrl: string;
    expiresAt: string;
    mimeType: string;
  };
  window.sessionStorage.setItem(sharedKey, JSON.stringify(asset));
  return asset;
}
export function getSharedSimulatedAudio() {
  try {
    const raw = window.sessionStorage.getItem(sharedKey);
    return raw
      ? (JSON.parse(raw) as { audioUrl: string; expiresAt: string; mimeType: string })
      : null;
  } catch {
    return null;
  }
}
