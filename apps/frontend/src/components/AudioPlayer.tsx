import { useEffect, useRef, useState } from 'react';
import { Download, Play, Share2, Upload } from 'lucide-react';
import { useSimulationStore } from '../store/simulation';
import { useAgentViewStore } from '../store/agentView';
import { renderSimulatedWav, shareSimulatedWav } from '../lib/simulatedAudio';

const samples = [
  {
    id: 'piano',
    name: 'Piano study',
    detail: 'Natural dynamics',
    url: new URL('../../wav/sample-15s.wav', import.meta.url).href,
  },
  {
    id: 'voice',
    name: 'Vocal detail',
    detail: 'Midrange focus',
    url: new URL('../../wav/sample-3s.wav', import.meta.url).href,
  },
  {
    id: 'electronic',
    name: 'Electronic bass',
    detail: 'Low-frequency extension',
    url: new URL('../../wav/audio-track-cy-14.mp3', import.meta.url).href,
  },
  {
    id: 'ambient',
    name: 'Ambient texture',
    detail: 'Space and decay',
    url: new URL(
      '../../wav/freesound_community-harddrive-2tb-failure-71691.mp3',
      import.meta.url
    ).href,
  },
  {
    id: 'keys',
    name: 'Keyboard bass',
    detail: 'Transient response',
    url: new URL('../../wav/Casio-CTK-611-Touch-Bass-C2.wav', import.meta.url).href,
  },
] as const;

export default function AudioPlayer() {
  const fileInput = useRef<HTMLInputElement>(null);
  const { audioFile, setAudioFile, simulationResult } = useSimulationStore();
  const [selectedId, setSelectedId] = useState('piano');
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [roomUrl, setRoomUrl] = useState<string | null>(null);
  const [status, setStatus] = useState('Choose a reference track to compare.');
  const [isRendering, setIsRendering] = useState(false);
  const selectedSample = samples.find((sample) => sample.id === selectedId) ?? samples[0];
  const agentTrackRequest = useAgentViewStore((state) => state.referenceTrackRequest);
  const setActiveLabel = useAgentViewStore((state) => state.setActiveReferenceTrackLabel);
  const musicPreferences = useAgentViewStore((state) => state.musicPreferences);
  useEffect(() => {
    if (
      agentTrackRequest?.sampleId &&
      agentTrackRequest.sampleId !== selectedId &&
      samples.some((sample) => sample.id === agentTrackRequest.sampleId)
    ) {
      void selectSample(agentTrackRequest.sampleId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentTrackRequest?.sampleId]);
  useEffect(() => {
    setActiveLabel(selectedSample.name);
  }, [selectedSample.name, setActiveLabel]);
  useEffect(() => {
    void selectSample(selectedSample.id); // Seed the player with a useful reference track.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!audioFile) return;
    const url = URL.createObjectURL(audioFile);
    setOriginalUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [audioFile]);
  useEffect(() => {
    let cancelled = false;
    if (!audioFile || !simulationResult) {
      setRoomUrl(null);
      return;
    }
    setIsRendering(true);
    setStatus('Rendering the room version…');
    void renderSimulatedWav(audioFile, simulationResult, 1)
      .then((wav) => {
        if (cancelled) return;
        const url = URL.createObjectURL(wav);
        setRoomUrl((previous) => {
          if (previous) URL.revokeObjectURL(previous);
          return url;
        });
        setStatus('Ready for side-by-side listening.');
      })
      .catch((error) => {
        if (!cancelled)
          setStatus(error instanceof Error ? error.message : 'Could not render the room version.');
      })
      .finally(() => {
        if (!cancelled) setIsRendering(false);
      });
    return () => {
      cancelled = true;
    };
  }, [audioFile, simulationResult]);
  async function selectSample(id: string) {
    const sample = samples.find((item) => item.id === id) ?? samples[0];
    setSelectedId(sample.id);
    setStatus(`Loading ${sample.name}…`);
    try {
      const response = await fetch(sample.url);
      if (!response.ok) throw new Error('The sample could not be loaded.');
      const blob = await response.blob();
      setAudioFile(
        new File([blob], sample.url.split('/').pop() ?? `${sample.id}.wav`, {
          type: blob.type || 'audio/wav',
        })
      );
      setStatus('Reference track ready.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not load the sample.');
    }
  }
  async function share() {
    if (!roomUrl || !simulationResult || !audioFile) return;
    try {
      const asset = await shareSimulatedWav(
        await renderSimulatedWav(audioFile, simulationResult, 1),
        simulationResult.simulationId
      );
      setStatus(
        `Room version shared with agent until ${new Date(asset.expiresAt).toLocaleTimeString()}.`
      );
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not share the room version.');
    }
  }
  return (
    <section className="listening-console">
      <div className="console-heading">
        <div>
          <p className="lab-panel-label">Listen and compare</p>
          <h2>{selectedSample.name}</h2>
          <span>{selectedSample.detail}</span>
          {musicPreferences?.summary && (
            <p className="agent-music-preferences">
              <strong>Music preferences</strong>
              <span>{musicPreferences.summary}</span>
              {musicPreferences.source && <em>via {musicPreferences.source}</em>}
            </p>
          )}
        </div>
        <button className="upload-track" onClick={() => fileInput.current?.click()}>
          <Upload size={14} /> Your track
        </button>
        <input
          ref={fileInput}
          hidden
          type="file"
          accept="audio/*"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) {
              setSelectedId('');
              setAudioFile(file);
              setStatus(`${file.name} ready.`);
            }
          }}
        />
      </div>
      <div className="sample-list">
        {samples.map((sample) => (
          <button
            key={sample.id}
            className={sample.id === selectedId ? 'selected' : ''}
            onClick={() => void selectSample(sample.id)}
          >
            <Play size={12} />
            <span>{sample.name}</span>
          </button>
        ))}
      </div>
      <div className="audio-compare">
        <article>
          <div>
            <span>Original</span>
            <small>Reference track</small>
          </div>
          {originalUrl ? (
            <audio controls src={originalUrl} />
          ) : (
            <div className="audio-loading">Preparing audio…</div>
          )}
        </article>
        <article className="room-audio">
          <div>
            <span>In your room</span>
            <small>
              {isRendering
                ? 'Rendering response…'
                : simulationResult
                  ? 'Room response applied'
                  : 'Waiting for simulation'}
            </small>
          </div>
          {roomUrl ? (
            <audio controls src={roomUrl} />
          ) : (
            <div className="audio-loading">
              {isRendering ? 'Rendering…' : 'Set room details to create this version.'}
            </div>
          )}
        </article>
      </div>
      <div className="console-footer">
        <p>{status}</p>
        <div>
          {roomUrl && (
            <a
              href={roomUrl}
              download={`acoustom-room-${simulationResult?.simulationId ?? 'preview'}.wav`}
            >
              <Download size={14} /> Download
            </a>
          )}
          {roomUrl && (
            <button onClick={() => void share()}>
              <Share2 size={14} /> Share with agent
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
