import { useEffect, useMemo, useRef, useState } from 'react';
import type React from 'react';
import {
  Box,
  ChevronDown,
  CircuitBoard,
  Headphones,
  Pause,
  Play,
  Plus,
  Radio,
  Ruler,
  SlidersHorizontal,
  Volume2,
  Waves,
  Weight,
  X,
} from 'lucide-react';
import type { CustomSpeakerConfiguration, SimulationResult } from '@acoustom/types';
import type { Product } from '../App';
import { apiUrl } from '../lib/api';
import { readLocalBuilds, type LocalBuild } from '../lib/localBuilds';
import { renderSimulatedWav } from '../lib/simulatedAudio';
type Props = {
  products: Product[];
  onBack: () => void;
};
type Profile = {
  status: 'reference_ready' | 'component_model_ready' | 'requires_measurement';
  referenceId: 'two_way_compact' | 'two_way_extended' | 'three_way_reference' | 'subwoofer_active';
  modelInputs?: unknown;
};
type Speaker = {
  id: string;
  name: string;
  type: string;
  image: string;
  price: number;
  specs: [string, string][];
  product?: Product;
  configuration?: CustomSpeakerConfiguration;
  profile?: Profile;
};
type AudioState = { status: string; url?: string };
const room = { width: 5, length: 4, height: 2.7, presetId: 'living_room' },
  positions = [
    { x: 1.2, y: 0.8, z: 0.6, rotation: 15 },
    { x: 3.8, y: 0.8, z: 0.6, rotation: -15 },
  ],
  listener = { x: 2.5, y: 3.2, z: 1.1 };
const usd = (x: string | number) =>
  `$${(typeof x === 'number' ? x : Number(x.replace(/[^0-9.]/g, '')) || 0).toLocaleString('en-US')}`;
const icon = (m: string) =>
  m.includes('Frequency') ? (
    <Waves />
  ) : m.includes('Sensitivity') || m.includes('SPL') ? (
    <Volume2 />
  ) : m.includes('impedance') || m.includes('Crossover') ? (
    <CircuitBoard />
  ) : m.includes('Dimensions') ? (
    <Ruler />
  ) : m.includes('Weight') ? (
    <Weight />
  ) : m.includes('Cabinet') ? (
    <Box />
  ) : m === 'System' ? (
    <Radio />
  ) : (
    <SlidersHorizontal />
  );
const SPEC_ORDER = [
  'System',
  'Architecture',
  'Drivers',
  'Frequency response',
  'Sensitivity',
  'Nominal impedance',
  'Recommended amplifier power',
  'Crossover frequency',
  'Maximum SPL',
  'Amplification',
  'Inputs',
  'Calibration',
  'Wireless',
  'Room correction',
  'Directivity',
  'Format',
  'Cabinet size',
  'Cabinet materials',
  'Cabinet finishes',
  'Finish family',
  'Grille',
  'Base',
  'Edge profile',
  'Dimensions (H × W × D)',
  'Weight',
  'Alignment',
  'Bass character',
  'Net volume',
  'Port tuning',
  'Port diameter',
  'Port length',
  'Damping',
  'Voicing target',
  'Room size',
  'Listening distance',
  'Simulation status',
  'Model type',
  'Measurement status',
  'Manufacturing status',
  'Compatibility notes',
  'Measurement required for',
  'Simulated changes',
  'Warnings',
  'Reference source',
  'Source assets',
] as const;
function Player({ source, label }: { source?: string; label: string }) {
  const ref = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  return (
    <div className="matrix-audio">
      <audio ref={ref} src={source} onEnded={() => setPlaying(false)} />
      <button
        disabled={!source}
        onClick={() => {
          if (!ref.current || !source) return;
          if (ref.current.paused) {
            void ref.current.play();
            setPlaying(true);
          } else {
            ref.current.pause();
            setPlaying(false);
          }
        }}
      >
        {playing ? <Pause size={16} /> : <Play size={16} />}
      </button>
      <span>{label}</span>
      <Volume2 size={15} />
    </div>
  );
}
export default function ComparisonPage({ products, onBack }: Props) {
  const [saved, setSaved] = useState<LocalBuild[]>(() => readLocalBuilds()?.builds ?? []);
  useEffect(() => {
    const refresh = () => setSaved(readLocalBuilds()?.builds ?? []);
    window.addEventListener('acoustom-builds-updated', refresh);
    return () => window.removeEventListener('acoustom-builds-updated', refresh);
  }, []);
  const [scrolled, setScrolled] = useState(false);
  const matrixRef = useRef<HTMLElement>(null);
  const catalog = useMemo<Speaker[]>(
    () =>
      products.map((p) => ({
        id: `catalog:${p.id}`,
        name: p.name,
        type: p.type,
        image: p.image,
        price: Number(p.price.replace(/[^0-9.]/g, '')) || 0,
        specs: p.specs,
        product: p,
      })),
    [products]
  );
  const custom = useMemo<Speaker[]>(
    () =>
      saved.map((b) => ({
        id: `custom:${b.id}`,
        name: b.name,
        type: 'Custom design',
        image: '/images/components/platform-compact.png',
        price: 0,
        configuration: b.configuration,
        specs: b.specs ?? [],
        profile: b.derived?.simulationProfile as Profile | undefined,
      })),
    [saved]
  );
  const choices = useMemo(() => [...catalog, ...custom], [catalog, custom]);
  const [slots, setSlots] = useState<(Speaker | null)[]>([
    catalog[0] ?? null,
    null,
    null,
    null,
    null,
  ]);
  const [chooser, setChooser] = useState<number | null>(null);
  const [audio, setAudio] = useState<Record<string, AudioState>>({});
  const resolvedSlots = useMemo(
    () =>
      slots.map((slot) =>
        slot ? (choices.find((choice) => choice.id === slot.id) ?? slot) : null
      ),
    [slots, choices]
  );
  const selected = useMemo(
    () => resolvedSlots.filter((speaker): speaker is Speaker => !!speaker),
    [resolvedSlots]
  );
  const metrics = useMemo(() => {
    const available = new Set(selected.flatMap((speaker) => speaker.specs.map(([label]) => label)));
    const ordered = SPEC_ORDER.filter((label) => available.has(label));
    const additional = Array.from(available).filter(
      (label) => !SPEC_ORDER.includes(label as (typeof SPEC_ORDER)[number])
    );
    return [...ordered, ...additional];
  }, [selected]);
  const setSlot = (i: number, s: Speaker | null) => {
    setSlots((all) => all.map((x, n) => (n === i ? s : x)));
    setChooser(null);
  };
  const available = (i: number) =>
    choices.filter((s) => !resolvedSlots.some((x, n) => n !== i && x?.id === s.id));
  useEffect(() => {
    if (!selected.length && catalog[0]) setSlots([catalog[0], null, null, null, null]);
  }, [catalog, selected.length]);
  useEffect(() => {
    const onScroll = () => {
      const m = matrixRef.current;
      if (m) setScrolled(m.getBoundingClientRect().top < 120);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  useEffect(() => {
    let dead = false;
    const abort = new AbortController(),
      urls: string[] = [];
    const run = async () => {
      const source = await fetch('/wav/sample-15s.wav');
      const track = new File([await source.blob()], 'reference.wav', {
        type: 'audio/wav',
      });
      await Promise.all(
        selected.map(async (s) => {
          if (!s.product && !s.profile) return;
          setAudio((a) => ({
            ...a,
            [s.id]: { status: 'Generating simulation…' },
          }));
          try {
            const request = s.product
              ? {
                  speakerId: s.product.name,
                  room,
                  speakers: positions,
                  listener,
                }
              : {
                  speakerId: 'custom-reference',
                  speakerProfile: s.profile,
                  room,
                  speakers: positions,
                  listener,
                };
            const response = await fetch(apiUrl('/api/simulate'), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(request),
              signal: abort.signal,
            });
            if (!response.ok) throw Error();
            setAudio((a) => ({ ...a, [s.id]: { status: 'Rendering audio…' } }));
            const wav = await renderSimulatedWav(
              track,
              (await response.json()) as SimulationResult
            );
            const url = URL.createObjectURL(wav);
            urls.push(url);
            if (!dead) setAudio((a) => ({ ...a, [s.id]: { status: 'Ready', url } }));
          } catch {
            if (!dead && !abort.signal.aborted)
              setAudio((a) => ({ ...a, [s.id]: { status: 'Unavailable' } }));
          }
        })
      );
    };
    void run().catch(() => undefined);
    return () => {
      dead = true;
      abort.abort();
      urls.forEach(URL.revokeObjectURL);
    };
  }, [selected]);
  const cells = (f: (s: Speaker | null, i: number) => React.ReactNode) => resolvedSlots.map(f);
  return (
    <main className="comparison-page comparison-redesign">
      <div className={`comparison-sticky-bar${scrolled ? ' is-visible' : ''}`}>
        <div className="comparison-sticky-bar-inner">
          <div className="sticky-head">Speakers</div>
          {cells((s, i) => (
            <div className="sticky-cell" key={i}>
              {s ? (
                <>
                  <span className="sticky-name">{s.name}</span>
                  <span className="sticky-price">{usd(s.price)} per pair</span>
                </>
              ) : null}
            </div>
          ))}
        </div>
      </div>
      <button className="back-link" onClick={onBack}>
        ← Back to collection
      </button>
      <header className="comparison-hero">
        <div>
          <p className="eyebrow">Speaker comparison</p>
          <h1>
            Hear the <em>difference.</em>
          </h1>
          <p>
            Choose up to five speakers. Every selection is tested against one room and one reference
            track.
          </p>
        </div>
        <div className="comparison-room-card">
          <span>Sound simulation</span>
          <strong>Living room</strong>
          <small>5.0 × 4.0 × 2.7 m</small>
          <i>
            <Headphones size={16} /> Same room for every speaker
          </i>
        </div>
      </header>
      <section className="comparison-matrix" ref={matrixRef as any}>
        <div className="matrix-row matrix-speaker-row">
          <div className="matrix-head">
            <span>Speakers</span>
            <small>{selected.length} of 5 selected</small>
          </div>
          {cells((s, i) => (
            <div className="matrix-cell matrix-speaker" key={i}>
              {s ? (
                <article>
                  <button className="matrix-remove" onClick={() => setSlot(i, null)}>
                    <X size={12} />
                  </button>
                  <img src={s.image} alt={s.name} />
                  <div>
                    <p>{s.type}</p>
                    <h2>{s.name}</h2>
                    <strong>
                      {usd(s.price)} <small>per pair</small>
                    </strong>
                  </div>
                </article>
              ) : (
                <button className="matrix-add" onClick={() => setChooser(i)}>
                  <Plus size={24} />
                  <span>Add speaker</span>
                  <ChevronDown size={16} />
                </button>
              )}
            </div>
          ))}
        </div>
        <div className="matrix-row matrix-sound-row">
          <div className="matrix-head">
            <span>Sound simulation</span>
            <small>Original reference</small>
            <Player source="/wav/sample-15s.wav" label="Reference track" />
          </div>
          {cells((s, i) => (
            <div className="matrix-cell matrix-sound" key={i}>
              {s ? (
                audio[s.id]?.url ? (
                  <Player source={audio[s.id].url} label="Simulated response" />
                ) : (
                  <div className="matrix-status">
                    {audio[s.id]?.status ??
                      (s.profile || s.product
                        ? 'Generating simulation…'
                        : 'Deriving build profile…')}
                  </div>
                )
              ) : null}
            </div>
          ))}
        </div>
        <div className="matrix-row matrix-spec-title">
          <div className="matrix-head">
            <span>Specifications</span>
            <small>Metric</small>
          </div>
          {cells((_s, i) => (
            <div className="matrix-cell" key={i} />
          ))}
        </div>
        {metrics.map((m) => (
          <div className="matrix-row matrix-metric-row" key={m}>
            <div className="matrix-metric">
              {icon(m)}
              <span>{m}</span>
            </div>
            {cells((s, i) => (
              <div className="matrix-value" key={i}>
                {s ? (s.specs.find(([label]) => label === m)?.[1] ?? '—') : ''}
              </div>
            ))}
          </div>
        ))}
      </section>
      {chooser !== null && (
        <div className="speaker-modal-backdrop" onClick={() => setChooser(null)}>
          <section className="speaker-modal" onClick={(e) => e.stopPropagation()}>
            <header>
              <div>
                <p className="eyebrow">Choose a speaker</p>
                <h2>Add to comparison</h2>
              </div>
              <button onClick={() => setChooser(null)}>
                <X size={18} />
              </button>
            </header>
            <div className="speaker-modal-list">
              {available(chooser).map((s) => (
                <button key={s.id} onClick={() => setSlot(chooser, s)}>
                  <img src={s.image} alt="" />
                  <span>
                    <strong>{s.name}</strong>
                    <small>
                      {s.type} · {usd(s.price)}
                    </small>
                  </span>
                  <Plus size={18} />
                </button>
              ))}
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
