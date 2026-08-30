import { useSimulationStore } from '../store/simulation';

export default function SimulationControls() {
  const { simulationStatus, simulationError, simulationResult, retrySimulation } = useSimulationStore();
  const copy: Record<string, string> = {
    idle: 'Choose a speaker to begin.',
    queued: 'Room changed — updating automatically…',
    simulating: 'Computing the room response…',
    ready: 'Room response is ready. Upload any track and press play.',
    error: typeof simulationError === 'string' ? simulationError : 'Room simulation failed. Check the room positions and try again.',
  };

  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
      <div className="flex items-center justify-between gap-4">
        <div><h3 className="text-lg font-semibold">Simulate room</h3><p className="mt-1 text-sm text-slate-400">Room changes update automatically after you stop dragging. You can also run it now.</p><p className={simulationStatus === 'error' ? 'mt-2 text-sm text-red-300' : 'mt-2 text-sm text-slate-300'}>{copy[simulationStatus] ?? 'Ready to simulate.'}</p></div>
        <span className={`h-3 w-3 shrink-0 rounded-full ${simulationStatus === 'ready' ? 'bg-emerald-400' : simulationStatus === 'error' ? 'bg-red-400' : 'animate-pulse bg-blue-400'}`} aria-hidden="true" />
      </div>
      <button type="button" onClick={retrySimulation} disabled={simulationStatus === 'simulating'} className="mt-4 w-full rounded-lg bg-blue-600 py-3 font-semibold hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">{simulationStatus === 'simulating' ? 'Simulating room…' : 'Simulate room now'}</button>
      {simulationResult && <p className="mt-3 text-xs text-slate-500">Estimated RT60: {simulationResult.metrics.rt60.toFixed(2)} s</p>}
    </div>
  );
}
