import { useRef, useState } from 'react';
import type React from 'react';
import { useSimulationStore } from '../store/simulation';

export default function RoomEditor() {
  const svgRef = useRef<SVGSVGElement>(null);
  const { roomDimensions, speakerPositions, listenerPosition, setRoomDimensions, setSpeakerPosition, setListenerPosition } = useSimulationStore();
  const [dragging, setDragging] = useState<'left' | 'right' | 'listener' | null>(null);
  const dimensions = roomDimensions;
  const scale = 100;
  const dimensionLimits = { width: [2, 20], length: [2, 20], height: [2, 10] } as const;
  function move(e: React.PointerEvent<SVGSVGElement>) {
    if (!dragging || !svgRef.current) return;
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(svgRef.current.getScreenCTM()?.inverse());
    const x = Math.max(0.2, Math.min(dimensions.width - 0.2, p.x / scale));
    const y = Math.max(0.2, Math.min(dimensions.length - 0.2, p.y / scale));
    if (dragging === 'listener') setListenerPosition({ x, y }); else setSpeakerPosition(dragging, { x, y });
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-2">Configure Room</h2>
      <p className="text-slate-400 mb-6">Position your speakers and listening position</p>

      <div className="flex flex-wrap gap-3 mb-4">
        {(['width', 'length', 'height'] as const).map((key) => <label key={key} className="text-sm capitalize text-slate-400">{key}<input type="number" min={dimensionLimits[key][0]} max={dimensionLimits[key][1]} step="0.1" value={dimensions[key]} onChange={(e) => { const value = e.currentTarget.valueAsNumber; if (Number.isFinite(value)) setRoomDimensions({ [key]: Math.min(dimensionLimits[key][1], Math.max(dimensionLimits[key][0], value)) }); }} className="ml-2 w-20 rounded bg-slate-800 border border-slate-700 px-2 py-1 text-white" /> m</label>)}
        <label className="text-sm text-slate-400">Acoustics<select value={dimensions.presetId} onChange={(e) => setRoomDimensions({ presetId: e.target.value })} className="ml-2 rounded bg-slate-800 border border-slate-700 px-2 py-1 text-white"><option value="living_room">Normal living room</option><option value="reflective">Reflective</option><option value="absorptive">Absorptive</option></select></label>
      </div>
      <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${dimensions.width * scale} ${dimensions.length * scale}`}
          className="w-full h-96 bg-slate-900 rounded"
          onPointerMove={move} onPointerUp={() => setDragging(null)} onPointerLeave={() => setDragging(null)}
        >
          {/* Room boundaries */}
          <rect
            x="0"
            y="0"
            width={dimensions.width * scale} height={dimensions.length * scale}
            fill="none"
            stroke="#475569"
            strokeWidth="2"
          />

          {/* Left speaker */}
          <g transform={`translate(${speakerPositions.left.x * scale}, ${speakerPositions.left.y * scale})`} onPointerDown={() => setDragging('left')} className="cursor-grab">
            <circle r="12" fill="#3b82f6" />
            <text y="4" textAnchor="middle" fill="#f8fafc" fontSize="10">L</text>
          </g>

          {/* Right speaker */}
          <g transform={`translate(${speakerPositions.right.x * scale}, ${speakerPositions.right.y * scale})`} onPointerDown={() => setDragging('right')} className="cursor-grab">
            <circle r="12" fill="#3b82f6" />
            <text y="4" textAnchor="middle" fill="#f8fafc" fontSize="10">R</text>
          </g>

          {/* Listener */}
          <g transform={`translate(${listenerPosition.x * scale}, ${listenerPosition.y * scale})`} onPointerDown={() => setDragging('listener')} className="cursor-grab">
            <circle r="10" fill="#f59e0b" />
            <text y="4" textAnchor="middle" fill="#0f172a" fontSize="10">●</text>
          </g>
        </svg>
      </div>
    </div>
  );
}
