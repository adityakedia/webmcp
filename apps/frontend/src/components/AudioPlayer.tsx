import { useEffect, useRef, useState } from 'react';
import { useSimulationStore } from '../store/simulation';
import { apiUrl } from '../lib/api';
import { renderSimulatedWav, shareSimulatedWav } from '../lib/simulatedAudio';

const MAX_AUDIO_BYTES = 50 * 1024 * 1024;

export default function AudioPlayer() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { audioFile, setAudioFile, simulationResult } = useSimulationStore();
  const [fileError, setFileError] = useState<string | null>(null);
  const [isPreparing, setIsPreparing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [mode, setMode] = useState<'original' | 'simulated'>('original');
  const [simulatedLevel, setSimulatedLevel] = useState(4);
  const [isExporting, setIsExporting] = useState(false);
  const contextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);

  function stop() {
    sourceRef.current?.stop();
    sourceRef.current = null;
    setIsPlaying(false);
  }

  useEffect(() => () => { sourceRef.current?.stop(); void contextRef.current?.close(); }, []);
  useEffect(() => { stop(); }, [simulationResult?.simulationId]);
  async function handleFile(file: File | undefined) {
    stop();
    audioBufferRef.current = null;
    if (!file) { setAudioFile(null); return; }
    if (file.size > MAX_AUDIO_BYTES) { setAudioFile(null); setFileError('Choose an audio file smaller than 50 MB.'); return; }
    setIsPreparing(true); setFileError(null);
    try {
      const context = contextRef.current ?? new AudioContext();
      contextRef.current = context;
      audioBufferRef.current = await context.decodeAudioData(await file.arrayBuffer());
      setAudioFile(file);
    }
    catch (error) {
      setAudioFile(null);
      setFileError(error instanceof Error && error.message ? `This browser could not decode the file: ${error.message}` : 'This browser could not decode the audio file.');
    } finally { setIsPreparing(false); }
  }

  async function play(nextMode: 'original' | 'simulated') {
    if (!audioFile || (nextMode === 'simulated' && !simulationResult)) return;
    const currentSimulation = simulationResult;
    stop();
    const context = contextRef.current ?? new AudioContext();
    contextRef.current = context;
    if (context.state === 'suspended') await context.resume();
    const source = context.createBufferSource();
    source.buffer = audioBufferRef.current ?? await context.decodeAudioData(await audioFile.arrayBuffer());
    if (nextMode === 'simulated') {
      const responses = await Promise.all(
        [currentSimulation!.impulseResponses.left, currentSimulation!.impulseResponses.right].map((url) => fetch(apiUrl(url), { cache: 'no-store' })),
      );
      if (responses.some((response) => !response.ok)) throw new Error('Could not load the room impulse response.');
      const impulseResponses = await Promise.all(responses.map(async (response) => context.decodeAudioData(await response.arrayBuffer())));
      const merger = context.createChannelMerger(2);
      impulseResponses.forEach((impulseResponse, channel) => {
        const convolver = context.createConvolver();
        convolver.normalize = false;
        convolver.buffer = impulseResponse;
        source.connect(convolver);
        convolver.connect(merger, 0, channel);
      });
      const level = context.createGain();
      level.gain.value = simulatedLevel;
      merger.connect(level).connect(context.destination);
    } else {
      source.connect(context.destination);
    }
    source.onended = () => setIsPlaying(false);
    sourceRef.current = source;
    setMode(nextMode);
    setIsPlaying(true);
    source.start();
  }
  async function exportSimulatedAudio(share = false) {
    if (!audioFile || !simulationResult) return;
    setIsExporting(true); setFileError(null);
    try { const wav = await renderSimulatedWav(audioFile, simulationResult, simulatedLevel); if (share) { const asset = await shareSimulatedWav(wav, simulationResult.simulationId); setFileError(`Shared with agent until ${new Date(asset.expiresAt).toLocaleTimeString()}.`); } else { const url = URL.createObjectURL(wav); const link = document.createElement('a'); link.href = url; link.download = `acoustom-${simulationResult.simulationId}.wav`; link.click(); URL.revokeObjectURL(url); } }
    catch (error) { setFileError(error instanceof Error ? error.message : 'Could not render simulated audio.'); }
    finally { setIsExporting(false); }
  }

  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
      <h3 className="text-lg font-semibold mb-4">Audio Source</h3>

      <div className="space-y-4">
        <div>
          <label className="block text-sm text-slate-400 mb-2">Choose a listening track</label>
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            onChange={(e) => void handleFile(e.target.files?.[0])}
            className="block w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700"
          />
        </div>

        <div className="border-t border-slate-700 pt-4">
          <p className="text-sm text-slate-500">{isPreparing ? 'Preparing audio…' : audioFile ? `Ready: ${audioFile.name}` : 'Choose a track to audition the current room response. Audio stays in your browser.'}</p>
          {fileError && <p className="mt-2 text-sm text-red-300">{fileError}</p>}
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-slate-700">
          <button disabled={!audioFile || isPlaying || isPreparing} onClick={() => void play('original').catch((error) => setFileError(error instanceof Error ? error.message : 'Playback failed.'))} className="rounded-lg bg-slate-700 px-4 py-2 text-sm hover:bg-slate-600 disabled:opacity-50">Play original</button>
          <button disabled={!audioFile || !simulationResult || isPlaying || isPreparing} onClick={() => void play('simulated').catch((error) => setFileError(error instanceof Error ? error.message : 'Playback failed.'))} className="rounded-lg bg-blue-600 px-4 py-2 text-sm hover:bg-blue-700 disabled:opacity-50">Play in room</button>
          <button disabled={!audioFile || !simulationResult || isExporting} onClick={() => void exportSimulatedAudio()} className="rounded-lg bg-slate-700 px-4 py-2 text-sm hover:bg-slate-600 disabled:opacity-50">{isExporting ? 'Rendering…' : 'Download simulated WAV'}</button>
          <button disabled={!audioFile || !simulationResult || isExporting} onClick={() => void exportSimulatedAudio(true)} className="rounded-lg bg-slate-700 px-4 py-2 text-sm hover:bg-slate-600 disabled:opacity-50">Share with agent</button>
          <button disabled={!isPlaying} onClick={stop} className="rounded-lg bg-slate-700 px-4 py-2 text-sm hover:bg-slate-600 disabled:opacity-50">Stop</button>
          <span className="text-sm text-slate-400">{isPlaying ? `Playing ${mode}` : simulationResult ? 'Ready for instant A/B playback' : 'Room response is updating'}</span>
        </div>
        <label className="block border-t border-slate-700 pt-4 text-sm text-slate-400">Room playback gain: {simulatedLevel.toFixed(1)}×
          <input type="range" min="0.5" max="4" step="0.1" value={simulatedLevel} onChange={(event) => setSimulatedLevel(Number(event.target.value))} className="mt-2 block w-full" />
        </label>
      </div>
    </div>
  );
}
