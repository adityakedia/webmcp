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
import { deriveBuildData, STANDARD_SPEC_KEYS } from '../lib/customBuildDerivation';
import { customBuildPrice } from '../lib/customBuildOptions';
import { renderSimulatedWav } from '../lib/simulatedAudio';
import { useAgentViewStore } from '../store/agentView';
import {
  DecayChart,
  FrequencyChart,
  ImpulseChart,
  ModeChart,
  modeFrequencies,
  roomLabel,
} from './SimulationInsights';
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
type AudioState = { status: string; url?: string; result?: SimulationResult };
const room = { width: 5, length: 4, height: 2.7, presetId: 'living_room' },
  positions = [
    { x: 1.2, y: 0.8, z: 0.6, rotation: 15 },
    { x: 3.8, y: 0.8, z: 0.6, rotation: -15 },
  ],
  listener = { x: 2.5, y: 3.2, z: 1.1 };
const referenceTrackUrl = new URL('../../wav/sample-15s.wav', import.meta.url).href;
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
function SpeakerSimulationData({
  result,
  speakerName,
}: {
  result: SimulationResult;
  speakerName: string;
}) {
  const rt60 = result.metrics.rt60;
  const character = roomLabel(rt60);
  const firstMode = Math.min(...modeFrequencies(room).map((mode) => mode.value));
  return (
    <div className="matrix-simulation-data">
      <div className="matrix-simulation-summary">
        <div><strong>{rt60.toFixed(2)} s</strong><span>{character} decay</span></div>
        <div><strong>{firstMode.toFixed(0)} Hz</strong><span>First room mode</span></div>
      </div>
      <p><strong>{speakerName}</strong> in your room</p>
      <div className="matrix-simulation-metrics">
        <div><span>Early decay</span><strong>{result.metrics.earlyDecayTime.toFixed(2)} s</strong></div>
        <div><span>Clarity C80</span><strong>{result.metrics.clarity.toFixed(1)} dB</strong></div>
        <div><span>Definition D50</span><strong>{(result.metrics.definition * 100).toFixed(0)}%</strong></div>
      </div>
      <div className="matrix-simulation-chart">
        <span>Energy decay <small>modelled</small></span>
        <DecayChart rt60={rt60} />
      </div>
      <div className="matrix-simulation-chart">
        <span>Room modes <small>estimated</small></span>
        <ModeChart room={room} />
      </div>
      <div className="matrix-simulation-chart">
        <span>Frequency response <small>in-room gain</small></span>
        <FrequencyChart points={result.frequencyResponse} />
      </div>
      <div className="matrix-simulation-chart">
        <span>Impulse response <small>left + right</small></span>
        <ImpulseChart urls={result.impulseResponses} />
      </div>
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
      saved.map((b) => {
        // Specs, simulation data and price are fully determined by the stored
        // configuration, so derive them on the spot. Stored server specs are
        // ignored here: they carry engineering commentary the matrix must not
        // show, and the derived values are identical.
        const derivedData = deriveBuildData(b.configuration);
        return {
          id: `custom:${b.id}`,
          name: b.name,
          type: 'Custom design',
          image: '/images/components/platform-compact.png',
          price: customBuildPrice(b.configuration),
          configuration: b.configuration,
          specs: derivedData.specs,
          profile: derivedData.derived.simulationProfile,
        };
      }),
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
  const agentSelection = useAgentViewStore((state) => state.comparisonSelection);
  const agentSelectionSource = useAgentViewStore((state) => state.comparisonSelectionSource);
  const setAgentSelection = useAgentViewStore((state) => state.setComparisonSelection);
  useEffect(() => {
    if (agentSelectionSource !== 'agent' || !choices.length) return;
    const next = (agentSelection.length ? agentSelection : [choices[0]?.id ?? ''])
      .map((id) => choices.find((choice) => choice.id === id) ?? null)
      .concat(Array(Math.max(0, 5 - agentSelection.length)).fill(null))
      .slice(0, 5) as (Speaker | null)[];
    setSlots(next);
    setAgentSelection(agentSelection, 'user');
  }, [agentSelection, agentSelectionSource, choices, setAgentSelection]);
  useEffect(() => {
    if (!slots.length) return;
    const ids = slots.filter((slot): slot is Speaker => !!slot).map((slot) => slot.id);
    if (
      agentSelectionSource === 'user' &&
      ids.length &&
      ids.join('|') !== agentSelection.join('|')
    )
      setAgentSelection(ids, 'user');
  }, [slots, agentSelection, agentSelectionSource, setAgentSelection]);
  const resolvedSlots = slots;
  const selected = useMemo(
    () => resolvedSlots.filter((speaker): speaker is Speaker => !!speaker),
    [resolvedSlots]
  );
  const selectedIds = useMemo(
    () => new Set(selected.map((speaker) => speaker.id)),
    [selected]
  );
  const availableChoices = useMemo(
    () => choices.filter((choice) => !selectedIds.has(choice.id)),
    [choices, selectedIds]
  );
  const metrics = useMemo(() => {
    const available = new Set(selected.flatMap((speaker) => speaker.specs.map(([label]) => label)));
    const standard = STANDARD_SPEC_KEYS.filter((label) => available.has(label));
    const additional = Array.from(available).filter(
      (label) => !(STANDARD_SPEC_KEYS as readonly string[]).includes(label)
    );
    return [...standard, ...additional];
  }, [selected]);
  const setSlot = (i: number, s: Speaker | null) => {
    setSlots((all) => all.map((x, n) => (n === i ? s : x)));
    setChooser(null);
  };
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
      const source = await fetch(referenceTrackUrl);
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
            const result = (await response.json()) as SimulationResult;
            setAudio((a) => ({ ...a, [s.id]: { status: 'Rendering audio…', result } }));
            const wav = await renderSimulatedWav(track, result);
            const url = URL.createObjectURL(wav);
            urls.push(url);
            if (!dead)
              setAudio((a) => ({
                ...a,
                [s.id]: { status: 'Ready', url, result },
              }));
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
      <section className="comparison-matrix" id="comparison" ref={matrixRef as any}>
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
            <Player source={referenceTrackUrl} label="Reference track" />
          </div>
          {cells((s, i) => (
            <div className="matrix-cell matrix-sound" key={i}>
              {s ? (
                <>
                  {audio[s.id]?.url ? (
                    <Player source={audio[s.id].url} label="Simulated response" />
                  ) : (
                    <div className="matrix-status">
                      {audio[s.id]?.status ??
                        (s.profile || s.product
                          ? 'Generating simulation…'
                          : 'Deriving build profile…')}
                    </div>
                  )}
                  {audio[s.id]?.result && (
                    <SpeakerSimulationData result={audio[s.id].result} speakerName={s.name} />
                  )}
                </>
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
              {availableChoices.length ? (
                availableChoices.map((s) => (
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
                ))
              ) : (
                <p className="speaker-modal-empty">Every speaker is already in this comparison.</p>
              )}
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
