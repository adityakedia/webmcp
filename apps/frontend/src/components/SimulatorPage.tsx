import { useEffect } from 'react';
import type { Product } from '../App';
import AudioPlayer from './AudioPlayer';
import { useAutoSimulation } from '../hooks/useAutoSimulation';
import { useSimulationStore } from '../store/simulation';
import SimulationInsights from './SimulationInsights';
import RoomReferenceInput from './RoomReferenceInput';

type Props = { products: Product[]; onBack: () => void };

const presets = [
  { id: 'living_room', name: 'Living room', copy: 'Balanced furnishings and everyday surfaces.' },
  { id: 'reflective', name: 'Loft / studio', copy: 'Harder surfaces with a longer, brighter decay.' },
  { id: 'absorptive', name: 'Treated room', copy: 'Soft furnishings and acoustic treatment.' },
] as const;

export default function SimulatorPage({ products, onBack }: Props) {
  const selectedSpeakerId = useSimulationStore((state) => state.selectedSpeakerId);
  const room = useSimulationStore((state) => state.roomDimensions);
  const status = useSimulationStore((state) => state.simulationStatus);
  const result = useSimulationStore((state) => state.simulationResult);
  const error = useSimulationStore((state) => state.simulationError);
  const setSelectedSpeaker = useSimulationStore((state) => state.setSelectedSpeaker);
  const setRoomDimensions = useSimulationStore((state) => state.setRoomDimensions);
  const retry = useSimulationStore((state) => state.retrySimulation);
  const customProfile = (() => { try { const saved = window.sessionStorage.getItem('acoustom-custom-speaker-profile'); return saved ? JSON.parse(saved) as { referenceName: string } : null; } catch { return null; } })();
  useAutoSimulation();

  useEffect(() => {
    if (window.sessionStorage.getItem('acoustom-custom-speaker-profile') && selectedSpeakerId !== 'custom-reference') {
      setSelectedSpeaker('custom-reference');
      return;
    }
    const requested = window.sessionStorage.getItem('acoustom-preview-speaker');
    const requestedProduct = products.find((product) => product.name === requested);
    if (requestedProduct && selectedSpeakerId !== requestedProduct.name) {
      setSelectedSpeaker(requestedProduct.name);
      window.sessionStorage.removeItem('acoustom-preview-speaker');
    } else if (!selectedSpeakerId && products[0]) setSelectedSpeaker(products[0].name);
  }, [products, selectedSpeakerId, setSelectedSpeaker]);

  return <main className="simulator-page">
    <div className="simulator-heading"><div><button className="back-link" onClick={onBack}>← Back to collection</button><p className="eyebrow">Acoustom listening lab</p><h1>Hear it in<br /><em>your room.</em></h1><p>Choose a speaker, describe your space, then audition a track through its estimated room response.</p></div><div className={`simulator-status ${status === 'error' ? 'error' : ''}`}><span className={`status-orb ${status}`} />{status === 'ready' ? `Response ready · RT60 ${result?.metrics.rt60.toFixed(2)} s` : status === 'simulating' ? 'Calculating room response…' : status === 'error' ? error ?? 'Could not reach the simulator.' : 'Room changes update automatically'}</div></div>
    <section className="simulator-grid">
      <div className="simulator-controls">
        <label className="control-label">Speaker</label>
        <div className="simulator-select">{customProfile && <button onClick={() => setSelectedSpeaker('custom-reference')} className={selectedSpeakerId === 'custom-reference' ? 'selected' : ''}><span>Custom reference build</span><small>{customProfile.referenceName}</small></button>}{products.map((product) => <button key={product.name} onClick={() => { window.sessionStorage.removeItem('acoustom-custom-speaker-profile'); setSelectedSpeaker(product.name); }} className={selectedSpeakerId === product.name ? 'selected' : ''}><span>{product.name}</span><small>{product.type}</small></button>)}</div>
        <label className="control-label simulator-label">Room character</label>
        <div className="preset-grid">{presets.map((preset) => <button key={preset.id} onClick={() => setRoomDimensions({ presetId: preset.id })} className={room.presetId === preset.id ? 'selected' : ''}><b>{preset.name}</b><span>{preset.copy}</span></button>)}</div>
        <label className="control-label simulator-label">Room dimensions</label>
        <div className="dimension-grid">{(['width', 'length', 'height'] as const).map((key) => <label key={key}>{key}<div><input type="number" min={key === 'height' ? 2 : 2} max={key === 'height' ? 10 : 20} step="0.1" value={room[key]} onChange={(event) => { const value = event.currentTarget.valueAsNumber; if (Number.isFinite(value)) setRoomDimensions({ [key]: value }); }} /><span>m</span></div></label>)}</div>
        <RoomReferenceInput />
        <button className="simulate-button" onClick={retry}>Refresh room response <span>→</span></button>
      </div>
      <div className="simulator-listening"><div className={`room-visual ${room.presetId}`}><div className="room-wall" /><div className="speaker-marker left">L</div><div className="listener-marker">LISTEN</div><div className="speaker-marker right">R</div><div className="room-meta">{room.width}m × {room.length}m × {room.height}m<br />{presets.find((preset) => preset.id === room.presetId)?.name}</div></div><div className="listen-card"><p className="eyebrow">A/B listening</p><h2>Bring your own track</h2><p>Your audio remains in this browser. Once the response is ready, switch between the original and your simulated room.</p><AudioPlayer /></div></div>
    </section>
    <SimulationInsights result={result} room={room} speakerName={selectedSpeakerId === 'custom-reference' ? customProfile?.referenceName ?? 'Custom reference build' : products.find((product) => product.name === selectedSpeakerId)?.name ?? selectedSpeakerId} />
  </main>;
}
