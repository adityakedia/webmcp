import { useEffect, useState } from 'react';

export default function RoomReferenceInput() {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  useEffect(() => () => { if (imageUrl) URL.revokeObjectURL(imageUrl); }, [imageUrl]);
  const select = (file?: File) => { if (imageUrl) URL.revokeObjectURL(imageUrl); if (!file) { setImageUrl(null); setFileName(null); return; } setImageUrl(URL.createObjectURL(file)); setFileName(file.name); };
  return <section className="room-reference"><label className="control-label">Room reference image <small>optional</small></label><input type="file" accept="image/*" onChange={(event) => select(event.target.files?.[0])} /><p>Keep a room image alongside your manual dimensions and placement notes. It is not analysed automatically.</p>{imageUrl && <div className="room-reference-preview"><img src={imageUrl} alt={`Room reference: ${fileName ?? 'uploaded image'}`} /><span>{fileName}</span></div>}</section>;
}
