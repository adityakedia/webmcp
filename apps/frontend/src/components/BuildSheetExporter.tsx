import { useCallback, useEffect, useRef, useState } from 'react';
import type { CustomSpeakerBuild, CustomSpeakerConfiguration } from '@acoustom/types';
import ProceduralSpeaker from './ProceduralSpeaker';
import {
  composeBuildSheet,
  registerBuildSheetGenerator,
  type BuildSheetRequest,
} from '../lib/buildSheet';

export default function BuildSheetExporter() {
  const [request, setRequest] = useState<BuildSheetRequest | null>(null);
  const resolver = useRef<((image: string) => void) | null>(null);
  const front = useRef<string | null>(null);
  const rear = useRef<string | null>(null);
  const generate = useCallback(
    (next: { configuration: CustomSpeakerConfiguration; derived: CustomSpeakerBuild['derived'] }) =>
      new Promise<string>((resolve) => {
        front.current = null;
        rear.current = null;
        resolver.current = resolve;
        setRequest(next);
      }),
    []
  );
  const capture = useCallback(
    (view: 'front' | 'rear', image: string) => {
      if (!request) return;
      if (view === 'front') front.current = image;
      else rear.current = image;
      if (front.current && rear.current && resolver.current) {
        const resolve = resolver.current;
        resolver.current = null;
        void composeBuildSheet(request, front.current, rear.current)
          .then(resolve)
          .finally(() => setRequest(null));
      }
    },
    [request]
  );
  useEffect(() => {
    registerBuildSheetGenerator(generate);
    return () => registerBuildSheetGenerator(null);
  }, [generate]);
  if (!request) return null;
  return (
    <div aria-hidden="true" className="build-sheet-renderer">
      <div>
        <ProceduralSpeaker
          config={request.configuration}
          view="front"
          onCapture={(image) => capture('front', image)}
        />
      </div>
      <div>
        <ProceduralSpeaker
          config={request.configuration}
          view="rear"
          onCapture={(image) => capture('rear', image)}
        />
      </div>
    </div>
  );
}
