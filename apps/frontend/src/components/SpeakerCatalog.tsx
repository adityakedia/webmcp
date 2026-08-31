import { useState, useEffect } from 'react';
import type { Speaker } from '@acoustom/types';
import { apiUrl } from '../lib/api';

export default function SpeakerCatalog({ onSelect }: { onSelect: (id: string) => void }) {
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(apiUrl('/api/speakers'))
      .then((r) => r.json())
      .then((data: { speakers: Speaker[] }) => {
        setSpeakers(data.speakers);
        setLoading(false);
      })
      .catch(() => { setError('The speaker catalog could not be loaded.'); setLoading(false); });
  }, []);

  if (loading) return <div className="text-center py-12 text-slate-400">Loading speaker catalog...</div>;
  if (error) return <div className="rounded-lg border border-red-700 bg-red-900/50 p-4 text-red-200">{error}</div>;

  return (
    <div>
      <h2 className="text-2xl font-bold mb-2">Select a Speaker</h2>
      <p className="text-slate-400 mb-6">Choose a loudspeaker to simulate in your room</p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {speakers.map((speaker) => (
          <button
            key={speaker.id}
            onClick={() => onSelect(speaker.id)}
            className="p-4 bg-slate-800 rounded-lg border border-slate-700 hover:border-blue-500 transition-colors text-left"
          >
            <div className="text-lg font-semibold">{speaker.manufacturer} {speaker.model}</div>
            <div className="text-sm text-slate-400 capitalize">{speaker.type}</div>
            {speaker.sensitivity && (
              <div className="text-sm text-slate-500 mt-2">Sensitivity: {speaker.sensitivity} dB</div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
