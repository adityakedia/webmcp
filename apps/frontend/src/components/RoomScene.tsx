import { useEffect, useRef, useState } from 'react';
import { Canvas, type ThreeEvent } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';
import { MOUSE } from 'three';
import type { ListenerPosition, RoomDimensions, SpeakerPosition } from '@acoustom/types';
import { useSimulationStore } from '../store/simulation';

type DragTarget = 'left' | 'right' | 'listener' | null;

type Props = {
  room: RoomDimensions & { presetId: string };
  speakers: { left: SpeakerPosition; right: SpeakerPosition };
  listener: ListenerPosition;
};

type RoomStyle = {
  label: string;
  summary: string;
  floor: string;
  wall: string;
  accent: string;
  rug: string;
  grid: string;
  background: string;
};

function roomStyleFor(presetId: string): RoomStyle {
  if (presetId === 'reflective') {
    return {
      label: 'Reflective studio',
      summary: 'Hard floor, glass and sparse furnishings',
      floor: '#aeb6b8',
      wall: '#dce5e8',
      accent: '#9bc4d1',
      rug: '#b9ced4',
      grid: '#7599a3',
      background: '#d8e1e1',
    };
  }
  if (presetId === 'absorptive') {
    return {
      label: 'Treated room',
      summary: 'Carpet, fabric panels and soft absorption',
      floor: '#5c5b55',
      wall: '#3c4541',
      accent: '#90a69a',
      rug: '#77796d',
      grid: '#9eae9f',
      background: '#bec4b9',
    };
  }
  return {
    label: 'Living room',
    summary: 'Wood floor, rug and mixed soft furnishings',
    floor: '#bd9169',
    wall: '#d9c8b3',
    accent: '#b89368',
    rug: '#d5c7b3',
    grid: '#a57957',
    background: '#e5d8c8',
  };
}

function Cabinet({
  position,
  rotation,
  label,
  onPointerDown,
}: {
  position: [number, number, number];
  rotation: number;
  label: string;
  onPointerDown: (event: ThreeEvent<PointerEvent>) => void;
}) {
  return (
    <group position={position} rotation={[0, rotation, 0]} onPointerDown={onPointerDown}>
      <mesh castShadow>
        <boxGeometry args={[0.34, 1.15, 0.4]} />
        <meshStandardMaterial color="#28231e" roughness={0.48} />
      </mesh>
      <mesh position={[0, 0.22, -0.205]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.095, 0.095, 0.025, 24]} />
        <meshStandardMaterial color="#111111" roughness={0.28} />
      </mesh>
      <mesh position={[0, -0.16, -0.205]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.07, 0.07, 0.025, 24]} />
        <meshStandardMaterial color="#111111" roughness={0.28} />
      </mesh>
      <mesh position={[0, 0.78, 0]}>
        <sphereGeometry args={[0.11, 20, 20]} />
        <meshStandardMaterial color="#55c77a" emissive="#1a5631" emissiveIntensity={0.45} />
      </mesh>
      <Text
        position={[0, 1.06, 0]}
        fontSize={0.16}
        color="#1d5c32"
        anchorX="center"
        outlineWidth={0.012}
        outlineColor="#ffffff"
      >
        {label}
      </Text>
    </group>
  );
}

function Sofa({ room, style }: { room: RoomDimensions; style: RoomStyle }) {
  const y = Math.max(1, room.length - 0.75);
  return (
    <group position={[room.width / 2, 0.35, y]}>
      <mesh castShadow>
        <boxGeometry args={[Math.min(2.7, room.width - 0.8), 0.46, 0.7]} />
        <meshStandardMaterial
          color={style.label === 'Treated room' ? '#4a504b' : '#867665'}
          roughness={0.78}
        />
      </mesh>
      <mesh position={[0, 0.42, 0.23]}>
        <boxGeometry args={[Math.min(2.7, room.width - 0.8), 0.48, 0.16]} />
        <meshStandardMaterial color={style.label === 'Treated room' ? '#404743' : '#756757'} />
      </mesh>
    </group>
  );
}

function Listener({
  position,
  onPointerDown,
}: {
  position: ListenerPosition;
  onPointerDown: (event: ThreeEvent<PointerEvent>) => void;
}) {
  return (
    <group position={[position.x, 0, position.y]} onPointerDown={onPointerDown}>
      <mesh castShadow position={[0, 0.48, 0]}>
        <cylinderGeometry args={[0.15, 0.18, 0.92, 24]} />
        <meshStandardMaterial color="#2563eb" />
      </mesh>
      <mesh position={[0, 1.08, 0]}>
        <sphereGeometry args={[0.18, 24, 24]} />
        <meshStandardMaterial color="#4f8cff" />
      </mesh>
      <Text
        position={[0, 1.43, 0]}
        fontSize={0.16}
        color="#17469e"
        anchorX="center"
        outlineWidth={0.012}
        outlineColor="#ffffff"
      >
        Listener
      </Text>
    </group>
  );
}

function RoomTreatment({ room, style }: { room: RoomDimensions; style: RoomStyle }) {
  if (style.label === 'Treated room') {
    return (
      <group>
        {Array.from({ length: 6 }, (_, index) => {
          const column = index % 3;
          const row = Math.floor(index / 3);
          return (
            <mesh
              key={index}
              position={[room.width * (0.23 + column * 0.27), 1.15 + row * 0.72, 0.065]}
            >
              <boxGeometry args={[0.62, 0.48, 0.09]} />
              <meshStandardMaterial color={index % 2 ? '#72887a' : '#9a8873'} roughness={0.96} />
            </mesh>
          );
        })}
        <mesh position={[0.06, 1.3, room.length * 0.5]} rotation={[0, Math.PI / 2, 0]}>
          <boxGeometry args={[1.35, 0.75, 0.1]} />
          <meshStandardMaterial color="#60796c" roughness={0.96} />
        </mesh>
        <mesh position={[room.width - 0.06, 1.3, room.length * 0.5]} rotation={[0, Math.PI / 2, 0]}>
          <boxGeometry args={[1.35, 0.75, 0.1]} />
          <meshStandardMaterial color="#60796c" roughness={0.96} />
        </mesh>
      </group>
    );
  }
  if (style.label === 'Reflective studio') {
    return (
      <group>
        {[-0.5, 0.5].map((offset) => (
          <mesh
            key={offset}
            position={[room.width / 2 + offset * Math.min(room.width * 0.36, 1.15), 1.35, 0.065]}
          >
            <boxGeometry args={[Math.min(room.width * 0.28, 1.25), 1.9, 0.04]} />
            <meshStandardMaterial
              color="#aed5df"
              metalness={0.28}
              roughness={0.08}
              transparent
              opacity={0.72}
            />
          </mesh>
        ))}
        <mesh
          position={[room.width - 0.07, 1.22, room.length * 0.48]}
          rotation={[0, Math.PI / 2, 0]}
        >
          <boxGeometry args={[1.5, 1.7, 0.04]} />
          <meshStandardMaterial
            color="#c4e2e7"
            metalness={0.3}
            roughness={0.08}
            transparent
            opacity={0.6}
          />
        </mesh>
        <mesh position={[0.07, 1.22, room.length * 0.48]} rotation={[0, Math.PI / 2, 0]}>
          <boxGeometry args={[1.5, 1.7, 0.04]} />
          <meshStandardMaterial
            color="#c4e2e7"
            metalness={0.3}
            roughness={0.08}
            transparent
            opacity={0.6}
          />
        </mesh>
      </group>
    );
  }
  return (
    <group>
      <mesh position={[room.width * 0.2, 1.25, 0.08]}>
        <boxGeometry args={[Math.min(1.35, room.width * 0.28), 1.65, 0.06]} />
        <meshStandardMaterial color="#c5d5db" roughness={0.5} />
      </mesh>
      <mesh position={[room.width * 0.81, 1.25, 0.08]}>
        <boxGeometry args={[Math.min(1.2, room.width * 0.24), 1.65, 0.06]} />
        <meshStandardMaterial color="#c5d5db" roughness={0.5} />
      </mesh>
    </group>
  );
}

function StudioRoom({ room, speakers, listener }: Props) {
  const { width, length, height } = room;
  const style = roomStyleFor(room.presetId);
  const [dragging, setDragging] = useState<DragTarget>(null);
  const [draftSpeakers, setDraftSpeakers] = useState(speakers);
  const [draftListener, setDraftListener] = useState(listener);
  const speakersRef = useRef(speakers);
  const listenerRef = useRef(listener);
  const lastPointerX = useRef<number | null>(null);

  useEffect(() => {
    if (dragging) return;
    speakersRef.current = speakers;
    listenerRef.current = listener;
    setDraftSpeakers(speakers);
    setDraftListener(listener);
  }, [speakers, listener, dragging]);

  const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
  const pointToRoomPosition = (point: { x: number; z: number }) => ({
    x: clamp(point.x, 0.28, width - 0.28),
    y: clamp(point.z, 0.28, length - 0.28),
  });
  const updateDraft = (event: ThreeEvent<PointerEvent>) => {
    if (!dragging) return;
    if (dragging !== 'listener' && event.nativeEvent.shiftKey) {
      const previousX = lastPointerX.current ?? event.nativeEvent.clientX;
      const delta = event.nativeEvent.clientX - previousX;
      const current = speakersRef.current[dragging];
      const next = {
        ...speakersRef.current,
        [dragging]: {
          ...current,
          rotation: ((current.rotation + delta * 0.7 + 180) % 360) - 180,
        },
      };
      speakersRef.current = next;
      setDraftSpeakers(next);
      lastPointerX.current = event.nativeEvent.clientX;
      return;
    }
    const position = pointToRoomPosition(event.point);
    if (dragging === 'listener') {
      const next = { ...listenerRef.current, ...position };
      listenerRef.current = next;
      setDraftListener(next);
      lastPointerX.current = event.nativeEvent.clientX;
      return;
    }
    const next = {
      ...speakersRef.current,
      [dragging]: { ...speakersRef.current[dragging], ...position },
    };
    speakersRef.current = next;
    setDraftSpeakers(next);
    lastPointerX.current = event.nativeEvent.clientX;
  };
  const finishDrag = (event: ThreeEvent<PointerEvent>) => {
    if (!dragging) return;
    updateDraft(event);
    const store = useSimulationStore.getState();
    if (dragging === 'listener') store.setListenerPosition(listenerRef.current);
    else store.setSpeakerPosition(dragging, speakersRef.current[dragging]);
    setDragging(null);
    lastPointerX.current = null;
  };
  const startDrag = (target: Exclude<DragTarget, null>, event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    lastPointerX.current = event.nativeEvent.clientX;
    setDragging(target);
  };

  const rugWidth = Math.min(width - 0.7, 3.2);
  const rugLength = Math.min(length - 1.7, 2.9);
  return (
    <>
      <color attach="background" args={[style.background]} />
      <ambientLight intensity={style.label === 'Treated room' ? 0.75 : 1.2} />
      <hemisphereLight args={['#ffffff', style.floor, 1.1]} />
      <directionalLight
        position={[width * 0.35, height + 2, length * 0.5]}
        intensity={2}
        castShadow
      />
      <pointLight
        position={[width * 0.25, height - 0.25, length * 0.25]}
        intensity={style.label === 'Treated room' ? 16 : 23}
        color={style.label === 'Reflective studio' ? '#ddf4ff' : '#ffe0b8'}
      />
      <group onPointerMove={updateDraft} onPointerUp={finishDrag}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[width / 2, 0, length / 2]} receiveShadow>
          <planeGeometry args={[width, length]} />
          <meshStandardMaterial
            color={style.floor}
            roughness={style.label === 'Reflective studio' ? 0.22 : 0.76}
            metalness={style.label === 'Reflective studio' ? 0.22 : 0}
          />
        </mesh>
        <gridHelper
          args={[
            Math.max(width, length),
            Math.max(8, Math.round(Math.max(width, length) * 2)),
            style.grid,
            style.grid,
          ]}
          position={[width / 2, 0.012, length / 2]}
        />
        <mesh position={[width / 2, height / 2, 0]} receiveShadow>
          <boxGeometry args={[width, height, 0.12]} />
          <meshStandardMaterial
            color={style.wall}
            roughness={style.label === 'Reflective studio' ? 0.26 : 0.82}
          />
        </mesh>
        <mesh position={[0, height / 2, length / 2]} receiveShadow>
          <boxGeometry args={[0.12, height, length]} />
          <meshStandardMaterial
            color={style.wall}
            roughness={style.label === 'Reflective studio' ? 0.26 : 0.82}
          />
        </mesh>
        <mesh position={[width, height / 2, length / 2]} receiveShadow>
          <boxGeometry args={[0.12, height, length]} />
          <meshStandardMaterial
            color={style.wall}
            roughness={style.label === 'Reflective studio' ? 0.26 : 0.82}
          />
        </mesh>
        {style.label !== 'Reflective studio' && (
          <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            position={[width / 2, 0.025, length * 0.61]}
            receiveShadow
          >
            <planeGeometry args={[rugWidth, rugLength]} />
            <meshStandardMaterial color={style.rug} roughness={0.98} />
          </mesh>
        )}
        <RoomTreatment room={room} style={style} />
        <group position={[width / 2, 0.4, 0.52]}>
          <mesh castShadow>
            <boxGeometry args={[Math.min(width - 1.1, 2.5), 0.55, 0.38]} />
            <meshStandardMaterial color="#624a38" roughness={0.56} />
          </mesh>
          <mesh position={[0, 0.63, 0.04]}>
            <boxGeometry args={[1.15, 0.7, 0.08]} />
            <meshStandardMaterial color="#171717" roughness={0.4} />
          </mesh>
        </group>
        <Cabinet
          position={[draftSpeakers.left.x, draftSpeakers.left.z, draftSpeakers.left.y]}
          rotation={draftSpeakers.left.rotation}
          label="L"
          onPointerDown={(event) => startDrag('left', event)}
        />
        <Cabinet
          position={[draftSpeakers.right.x, draftSpeakers.right.z, draftSpeakers.right.y]}
          rotation={draftSpeakers.right.rotation}
          label="R"
          onPointerDown={(event) => startDrag('right', event)}
        />
        <Sofa room={room} style={style} />
        <Listener
          position={draftListener}
          onPointerDown={(event) => startDrag('listener', event)}
        />
      </group>
      <OrbitControls
        makeDefault
        enabled={!dragging}
        enablePan={false}
        target={[width / 2, 0.6, length / 2]}
        minDistance={3.5}
        maxDistance={13}
        maxPolarAngle={Math.PI / 2.05}
        mouseButtons={{ LEFT: MOUSE.PAN, MIDDLE: MOUSE.DOLLY, RIGHT: MOUSE.ROTATE }}
      />
    </>
  );
}

export default function RoomScene(props: Props) {
  return (
    <div className="room-scene">
      <Canvas
        shadows
        camera={{
          position: [
            props.room.width * 1.06,
            Math.max(5.1, props.room.height * 2),
            props.room.length * 1.3,
          ],
          fov: 47,
        }}
      >
        <StudioRoom {...props} />
      </Canvas>
      <div className="room-scene-help">
        Drag a speaker or listener to reposition · Shift-drag a speaker to rotate · Release to run
        a fresh simulation · Right-drag to explore · Scroll to zoom
      </div>
    </div>
  );
}
