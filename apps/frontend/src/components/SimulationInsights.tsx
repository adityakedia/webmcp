import { useEffect, useMemo, useState } from 'react';
import type { RoomDimensions, SimulationResult } from '@acoustom/types';
import { apiUrl } from '../lib/api';

type Props = { result: SimulationResult | null; room: RoomDimensions; speakerName: string | null };
const roomLabel = (rt60: number) =>
  rt60 < 0.45 ? 'Controlled' : rt60 < 0.7 ? 'Balanced' : 'Lively';
const modeFrequencies = (room: RoomDimensions) => [
  { label: 'Width', value: 343 / (2 * room.width) },
  { label: 'Length', value: 343 / (2 * room.length) },
  { label: 'Height', value: 343 / (2 * room.height) },
];

function DecayChart({ rt60, expanded = false }: { rt60: number; expanded?: boolean }) {
  const duration = Math.max(1.2, rt60 * 1.35);
  const points = Array.from(
    { length: 41 },
    (_, i) => `${(i / 40) * 100},${Math.max(7, 92 - ((60 * ((i / 40) * duration)) / rt60) * 1.35)}`
  ).join(' ');
  return (
    <div className={`insight-chart decay-chart ${expanded ? 'expanded' : ''}`}>
      <svg
        viewBox="0 0 100 100"
        role="img"
        aria-label={`Estimated decay to minus 60 decibels at ${rt60.toFixed(2)} seconds`}
        preserveAspectRatio="xMidYMid meet"
      >
        <path className="chart-grid-line" d="M0 25H100M0 50H100M0 75H100" />
        <polyline className="chart-line" points={points} />
        <line
          className="chart-marker"
          x1={(rt60 / duration) * 100}
          x2={(rt60 / duration) * 100}
          y1="7"
          y2="93"
        />
      </svg>
      <span className="chart-axis-label chart-axis-left">0 dB</span>
      <span className="chart-axis-label chart-axis-bottom">time / seconds</span>
      <span className="chart-axis-label chart-axis-right">−60 dB</span>
    </div>
  );
}

function ModeChart({ room }: { room: RoomDimensions }) {
  const modes = modeFrequencies(room);
  const max = 120;
  return (
    <div className="insight-chart mode-chart">
      <svg viewBox="0 0 360 150" role="img" aria-label="Estimated first axial room modes">
        <line className="mode-axis" x1="25" y1="120" x2="345" y2="120" />
        {[0, 40, 80, 120].map((tick) => (
          <text key={tick} x={25 + (tick / max) * 320} y="140" textAnchor="middle">
            {tick} Hz
          </text>
        ))}
        {modes.map((mode) => {
          const x = 25 + (Math.min(mode.value, max) / max) * 320;
          return (
            <g key={mode.label}>
              <line className="mode-line" x1={x} y1="25" x2={x} y2="120" />
              <text x={x} y="18" textAnchor="middle">
                {mode.value.toFixed(0)} Hz
              </text>
              <text className="mode-name" x={x} y="110" textAnchor="middle">
                {mode.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function FrequencyChart({ points }: { points: SimulationResult['frequencyResponse'] }) {
  const max = Math.max(6, ...points.map((point) => Math.abs(point.gainDb)));
  const plotted = points.map((point) => {
    const x = ((Math.log10(point.frequencyHz) - Math.log10(20)) / 3) * 100;
    const y = 50 - (point.gainDb / max) * 40;
    return `${x},${Math.max(8, Math.min(92, y))}`;
  }).join(' ');
  return <div className="insight-chart response-chart"><svg viewBox="0 0 100 100" role="img" aria-label="Modelled frequency response" preserveAspectRatio="xMidYMid meet"><path className="chart-grid-line" d="M0 20H100M0 50H100M0 80H100" /><polyline className="chart-line" points={plotted} /><text x="2" y="98">20 Hz</text><text x="98" y="98" textAnchor="end">20 kHz</text></svg><span className="chart-axis-label chart-axis-left">+{max.toFixed(0)} dB</span><span className="chart-axis-label chart-axis-right">−{max.toFixed(0)} dB</span></div>;
}

function ImpulseChart({ urls }: { urls: SimulationResult['impulseResponses'] }) {
  const [samples, setSamples] = useState<number[]>([]);
  useEffect(() => {
    let cancelled = false;
    const context = new AudioContext();
    Promise.all([urls.left, urls.right].map((url) => fetch(apiUrl(url)).then((response) => response.arrayBuffer()).then((data) => context.decodeAudioData(data))))
      .then((buffers) => {
        if (cancelled) return;
        const length = Math.min(...buffers.map((buffer) => buffer.length));
        const values = Array.from({ length: 220 }, (_, index) => {
          const start = Math.floor((index / 220) * length);
          const end = Math.max(start + 1, Math.floor(((index + 1) / 220) * length));
          return Math.max(...buffers.flatMap((buffer) => Array.from(buffer.getChannelData(0).slice(start, end)).map(Math.abs)));
        });
        const peak = Math.max(...values, 1e-12);
        setSamples(values.map((value) => value / peak));
      }).catch(() => setSamples([])).finally(() => void context.close());
    return () => { cancelled = true; void context.close(); };
  }, [urls.left, urls.right]);
  const points = samples.map((value, index) => `${(index / Math.max(1, samples.length - 1)) * 100},${92 - value * 78}`).join(' ');
  return <div className="insight-chart response-chart"><svg viewBox="0 0 100 100" role="img" aria-label="Simulated impulse response" preserveAspectRatio="xMidYMid meet"><path className="chart-grid-line" d="M0 25H100M0 50H100M0 75H100" />{samples.length > 0 && <polyline className="chart-line" points={points} />}<text x="2" y="98">0 s</text><text x="98" y="98" textAnchor="end">tail</text></svg></div>;
}

export default function SimulationInsights({ result, room, speakerName }: Props) {
  const [openResult, setOpenResult] = useState<SimulationResult | null>(null);
  const open = openResult === result;
  const rt60 = result?.metrics.rt60 ?? null;
  const modes = useMemo(() => modeFrequencies(room), [room]);
  if (!result || rt60 === null) return null;
  const analysisResult = result;
  const character = roomLabel(rt60);
  const primaryMode = Math.min(...modes.map((mode) => mode.value));
  return (
    <>
      <section className="simulation-insights" aria-label="Acoustic overview">
        <div className="insights-heading">
          <div>
            <p className="eyebrow">Acoustic readout</p>
            <h2>What the room is doing</h2>
          </div>
          <button className="insights-expand" onClick={() => setOpenResult(result)}>
            Explore data <span>↗</span>
          </button>
        </div>
        <div className="insight-overview">
          <div className="insight-metric">
            <span>Estimated RT60</span>
            <strong>{rt60.toFixed(2)} s</strong>
            <small>{character} decay</small>
          </div>
          <div className="insight-metric">
            <span>First room mode</span>
            <strong>{primaryMode.toFixed(0)} Hz</strong>
            <small>Low-frequency resonance</small>
          </div>
          <div className="insight-summary">
            <span>{speakerName ?? 'Selected speaker'} in your room</span>
            <p>
              {character === 'Lively'
                ? 'Longer decay may make music feel spacious, but can soften detail.'
                : character === 'Controlled'
                  ? 'Shorter decay supports precise detail and a tighter presentation.'
                  : 'A balanced decay supports clarity while retaining natural ambience.'}
            </p>
          </div>
        </div>
        <div className="insight-overview insight-detail-metrics">
          <div className="insight-metric">
            <span>Early decay time</span>
            <strong>{result.metrics.earlyDecayTime?.toFixed(2) ?? '—'} s</strong>
            <small>Early reflections</small>
          </div>
          <div className="insight-metric">
            <span>Clarity (C80)</span>
            <strong>{result.metrics.clarity?.toFixed(1) ?? '—'} dB</strong>
            <small>Music clarity</small>
          </div>
          <div className="insight-metric">
            <span>Definition (D50)</span>
            <strong>{result.metrics.definition != null ? `${(result.metrics.definition * 100).toFixed(0)}%` : '—'}</strong>
            <small>Speech definition</small>
          </div>
        </div>
        <div className="insight-mini-grid">
          <div>
            <div className="insight-title">
              <span>Energy decay</span>
              <small>modelled</small>
            </div>
            <DecayChart rt60={rt60} />
          </div>
          <div>
            <div className="insight-title">
              <span>Room modes</span>
              <small>estimated</small>
            </div>
            <ModeChart room={room} />
          </div>
          <div>
            <div className="insight-title">
              <span>Frequency response</span>
              <small>modelled in-room gain</small>
            </div>
            <FrequencyChart points={analysisResult.frequencyResponse} />
          </div>
          <div>
            <div className="insight-title">
              <span>Impulse response</span>
              <small>left + right channels</small>
            </div>
            <ImpulseChart urls={analysisResult.impulseResponses} />
          </div>
        </div>
        <p className="insight-disclaimer">
          Modelled estimates from room dimensions and the simulated impulse response—not a
          substitute for in-room microphone measurement.
        </p>
      </section>
      {open && (
        <div className="insight-modal-backdrop" onClick={() => setOpenResult(null)}>
          <section
            className="insight-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="insight-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="insights-heading">
              <div>
                <p className="eyebrow">Expanded analysis</p>
                <h2 id="insight-modal-title">Acoustic readout</h2>
              </div>
              <button
                className="modal-close"
                onClick={() => setOpenResult(null)}
                aria-label="Close expanded analysis"
              >
                ×
              </button>
            </div>
          <div className="modal-metric-row">
              <div>
                <span>RT60</span>
                <strong>{rt60.toFixed(2)} s</strong>
              </div>
              <div>
                <span>Room character</span>
                <strong>{character}</strong>
              </div>
              <div>
                <span>Primary mode</span>
                <strong>{primaryMode.toFixed(0)} Hz</strong>
              </div>
              <div><span>Early decay</span><strong>{analysisResult.metrics.earlyDecayTime?.toFixed(2) ?? '—'} s</strong></div>
              <div><span>Clarity / C80</span><strong>{analysisResult.metrics.clarity?.toFixed(1) ?? '—'} dB</strong></div>
              <div><span>Definition / D50</span><strong>{analysisResult.metrics.definition != null ? `${(analysisResult.metrics.definition * 100).toFixed(0)}%` : '—'}</strong></div>
            </div>
            <div className="modal-chart-block">
              <div className="insight-title">
                <span>Energy decay profile</span>
                <small>−60 dB reference</small>
              </div>
              <DecayChart rt60={rt60} expanded />
            </div>
            <div className="modal-chart-block">
              <div className="insight-title">
                <span>First axial room modes</span>
                <small>
                  {room.width} × {room.length} × {room.height} m
                </small>
              </div>
              <ModeChart room={room} />
            </div>
            <div className="modal-chart-block"><div className="insight-title"><span>Frequency response</span><small>modelled in-room gain</small></div><FrequencyChart points={analysisResult.frequencyResponse} /></div>
            <div className="modal-chart-block"><div className="insight-title"><span>Impulse response</span><small>left + right channels</small></div><ImpulseChart urls={analysisResult.impulseResponses} /></div>
            <p className="insight-disclaimer">
              Use these values to compare placements and room presets consistently. Final acoustic
              performance should be verified with measurements.
            </p>
          </section>
        </div>
      )}
    </>
  );
}
