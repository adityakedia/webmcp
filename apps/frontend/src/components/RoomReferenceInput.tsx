import { useRef, useState } from 'react';
import { ImagePlus, LoaderCircle } from 'lucide-react';
import { apiUrl } from '../lib/api';
import { useSimulationStore } from '../store/simulation';

export default function RoomReferenceInput() {
  const inputRef = useRef<HTMLInputElement>(null);
  const references = useSimulationStore((state) => state.roomReferenceAssets);
  const setReferences = useSimulationStore((state) => state.setRoomReferenceAssets);
  const [status, setStatus] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  async function upload(files: FileList | null) {
    const selected = files ? Array.from(files) : [];
    if (!selected.length) return;
    setUploading(true);
    setStatus('Preparing room images for your agent…');
    const form = new FormData();
    selected.forEach((file) => form.append('images', file));
    form.set('consent', 'true');
    try {
      const response = await fetch(apiUrl('/api/room-references'), { method: 'POST', body: form });
      if (!response.ok) throw new Error(`Room image upload failed (${response.status})`);
      const result = (await response.json()) as { references: typeof references };
      setReferences(result.references);
      setStatus(
        `${result.references.length} room image${result.references.length === 1 ? '' : 's'} ready for your agent to inspect.`
      );
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not prepare the room images.');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <section className="room-reference">
      <label className="control-label">
        Room images <small>optional</small>
      </label>
      <input
        ref={inputRef}
        hidden
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        onChange={(event) => void upload(event.target.files)}
      />
      <button
        type="button"
        className="room-reference-upload"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
      >
        {uploading ? <LoaderCircle size={14} className="spin" /> : <ImagePlus size={14} />}
        {uploading ? 'Preparing images…' : 'Add room images'}
      </button>
      <p>
        Images are shared temporarily with the Acoustom agent so it can propose an editable room
        profile. You can also attach room images directly in your conversation with the agent.
      </p>
      {status && <p className="room-reference-status">{status}</p>}
      {references.length > 0 && (
        <div className="room-reference-preview">
          {references.map((reference) => (
            <figure key={reference.id}>
              <img src={reference.imageUrl} alt={`Room reference: ${reference.fileName}`} />
              <figcaption>{reference.fileName}</figcaption>
            </figure>
          ))}
        </div>
      )}
    </section>
  );
}
