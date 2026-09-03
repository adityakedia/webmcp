import { Canvas, useThree } from '@react-three/fiber';
import { ContactShadows, Environment, OrbitControls, RoundedBox } from '@react-three/drei';
import { useEffect } from 'react';
import type { CustomSpeakerConfiguration } from '@acoustom/types';

const finishes: Record<string, [string, number]> = {
  walnut: ['#8b5936', 0.38],
  oak: ['#a6794e', 0.4],
  black_ash: ['#20211f', 0.5],
  satin_white: ['#dedbd3', 0.28],
  satin_black: ['#171716', 0.3],
  deep_blue: ['#1e314a', 0.35],
  custom_colour: ['#8a8176', 0.35],
};

function Material({
  finish,
  transparent = false,
  opacity = 1,
}: {
  finish: string;
  transparent?: boolean;
  opacity?: number;
}) {
  const [color, roughness] = finishes[finish] ?? finishes.walnut;
  return (
    <meshStandardMaterial
      color={color}
      roughness={roughness}
      metalness={0.02}
      transparent={transparent}
      opacity={opacity}
      depthWrite={!transparent}
    />
  );
}

function Screw({
  position,
  rotation = [0, 0, 0],
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
}) {
  return (
    <mesh position={position} rotation={rotation}>
      <cylinderGeometry args={[0.035, 0.035, 0.012, 16]} />
      <meshStandardMaterial color="#090a09" roughness={0.28} />
    </mesh>
  );
}

function Driver({
  position,
  radius,
  selected,
  onSelect,
  screws = true,
}: {
  position: [number, number, number];
  radius: number;
  selected: boolean;
  onSelect: () => void;
  screws?: boolean;
}) {
  const screwPositions: [number, number, number][] = [
    [radius * 0.82, radius * 0.82, 0.13],
    [-radius * 0.82, radius * 0.82, 0.13],
    [radius * 0.82, -radius * 0.82, 0.13],
    [-radius * 0.82, -radius * 0.82, 0.13],
  ];
  return (
    <group
      position={position}
      onClick={(event) => {
        event.stopPropagation();
        onSelect();
      }}
    >
      <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[radius * 1.12, radius * 1.12, 0.075, 64]} />
        <meshStandardMaterial color={selected ? '#b99b74' : '#292a28'} roughness={0.32} />
      </mesh>
      <mesh position={[0, 0, 0.045]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[radius * 0.88, radius * 0.88, 0.06, 64]} />
        <meshStandardMaterial color="#101110" roughness={0.24} />
      </mesh>
      <mesh position={[0, 0, 0.09]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[radius * 0.7, radius * 0.6, 0.035, 64]} />
        <meshStandardMaterial color={radius > 0.4 ? '#191a18' : '#252624'} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0, 0.13]}>
        <sphereGeometry args={[radius * 0.27, 32, 16]} />
        <meshStandardMaterial color="#5c5b55" roughness={0.18} />
      </mesh>
      {screws && screwPositions.map((p, i) => <Screw key={i} position={p} />)}
    </group>
  );
}

function Damping({ height, depth, width }: { height: number; depth: number; width: number }) {
  return (
    <group>
      {[0.46, 1.02, 1.58, 2.14, 2.7]
        .filter((y) => y < height - 0.15)
        .map((y, index) => (
          <mesh
            key={index}
            position={[width * 0.18, y + 0.16, -depth * 0.15]}
            rotation={[0, 0.2, 0]}
          >
            <dodecahedronGeometry args={[0.2, 1]} />
            <meshStandardMaterial color="#dedbd0" roughness={1} transparent opacity={0.74} />
          </mesh>
        ))}
    </group>
  );
}

export function SpeakerModel({
  config,
  showDrivers = true,
  showBass = true,
  showPersonalisation = true,
}: {
  config: CustomSpeakerConfiguration;
  showDrivers?: boolean;
  showBass?: boolean;
  showPersonalisation?: boolean;
}) {
  // Keep the canvas usable while a configuration is being assembled or replaced by HMR.
  const format = config.brief?.format ?? 'standmount';
  const subwoofer = format === 'subwoofer';
  const tall = format === 'floorstanding' || subwoofer;
  const scale =
    config.cabinet.size === 'compact' ? 0.84 : config.cabinet.size === 'large' ? 1.18 : 1;
  const height = (subwoofer ? 2.15 : tall ? 3.55 : 2.75) * scale;
  const width = (subwoofer ? 2.05 : tall ? 1.48 : 1.82) * scale;
  const depth = (subwoofer ? 1.3 : 1.04) * scale;
  const shell = 0.09;
  const tweeterY = height - 0.62;
  const wooferY = tall ? 1.2 : 1;
  const portY = 0.32;
  const radius = config.cabinet.edgeProfile === 'sculpted_radius' ? 0.12 : 0.045;
  const bassScale =
    config.bass.bassCharacter === 'tight'
      ? 0.9
      : config.bass.bassCharacter === 'extended'
        ? 1.1
        : 1;
  const portRadius = Math.min(
    width * 0.16,
    Math.max(0.09, ((config.bass.portInnerDiameterMm ?? 50) / 250) * bassScale)
  );
  const portTubeDepth = Math.min(
    depth * 0.55,
    Math.max(0.11, (config.bass.portLengthMm ?? 120) / 450)
  );
  const baseLift = config.cabinet.base === 'stand' ? 0.55 : 0;
  return (
    <group position={[0, 0.12 + baseLift, 0]}>
      {config.cabinet.base === 'plinth' && (
        <RoundedBox
          args={[width + 0.25, 0.16, depth + 0.25]}
          radius={0.035}
          smoothness={4}
          position={[0, 0.08, 0]}
          castShadow
        >
          <Material finish="black_ash" />
        </RoundedBox>
      )}
      {config.cabinet.base === 'slim_feet' &&
        [-1, 1].map((x) => (
          <mesh key={x} position={[x * width * 0.36, 0.08, 0]} castShadow>
            <boxGeometry args={[0.08, 0.16, depth * 0.7]} />
            <meshStandardMaterial color="#242421" roughness={0.4} />
          </mesh>
        ))}
      {config.cabinet.base === 'stand' && (
        <group>
          <mesh position={[0, -0.34, 0]} castShadow>
            <cylinderGeometry args={[width * 0.31, width * 0.4, 0.08, 32]} />
            <meshStandardMaterial color="#242421" roughness={0.42} />
          </mesh>
          <mesh position={[0, -0.12, 0]} castShadow>
            <cylinderGeometry args={[0.075, 0.075, 0.42, 20]} />
            <meshStandardMaterial color="#292a28" roughness={0.38} />
          </mesh>
        </group>
      )}
      <RoundedBox
        args={[width, height, shell]}
        radius={radius}
        smoothness={4}
        position={[0, height / 2 + 0.16, -depth / 2 + shell / 2]}
        castShadow
      >
        <Material finish={config.cabinet.finish} transparent opacity={0.2} />
      </RoundedBox>
      <RoundedBox
        args={[shell, height, depth]}
        radius={radius}
        smoothness={4}
        position={[-width / 2 + shell / 2, height / 2 + 0.16, 0]}
        castShadow
      >
        <Material finish={config.cabinet.finish} />
      </RoundedBox>
      <RoundedBox
        args={[shell, height, depth]}
        radius={radius}
        smoothness={4}
        position={[width / 2 - shell / 2, height / 2 + 0.16, 0]}
        castShadow
      >
        <Material finish={config.cabinet.finish} transparent opacity={0.18} />
      </RoundedBox>
      <RoundedBox
        args={[width, shell, depth]}
        radius={radius}
        smoothness={4}
        position={[0, height + 0.16 - shell / 2, 0]}
        castShadow
      >
        <Material finish={config.cabinet.finish} transparent opacity={0.22} />
      </RoundedBox>
      <RoundedBox
        args={[width, shell, depth]}
        radius={radius}
        smoothness={4}
        position={[0, 0.16 + shell / 2, 0]}
        castShadow
      >
        <Material finish={config.cabinet.finish} />
      </RoundedBox>
      <RoundedBox
        args={[width * 0.91, height, 0.075]}
        radius={radius}
        smoothness={4}
        position={[0, height / 2 + 0.16, depth / 2 + 0.035]}
        castShadow
      >
        <Material finish="black_ash" />
      </RoundedBox>
      <mesh position={[0, height * 0.52 + 0.16, 0]} castShadow>
        <boxGeometry args={[width - 0.16, 0.08, depth - 0.16]} />
        <Material finish={config.cabinet.finish} />
      </mesh>
      <mesh position={[0, height * 0.14 + 0.16, 0]} castShadow>
        <boxGeometry args={[width - 0.16, 0.08, depth - 0.16]} />
        <Material finish={config.cabinet.finish} />
      </mesh>
      <Damping height={height} depth={depth} width={width} />
      {showDrivers && (
        <>
          {!subwoofer && (
            <Driver
              position={[0, tweeterY + 0.16, depth / 2 + 0.1]}
              radius={0.28}
              selected={false}
              onSelect={() => undefined}
            />
          )}
          <Driver
            position={[0, wooferY + 0.16, depth / 2 + 0.1]}
            radius={(subwoofer ? width * 0.33 : tall ? 0.54 : 0.62) * bassScale}
            selected={false}
            onSelect={() => undefined}
          />
          {config.platformId === 'three_way_reference' && (
            <Driver
              position={[0, height * 0.52 + 0.16, depth / 2 + 0.1]}
              radius={0.34}
              selected={false}
              onSelect={() => undefined}
            />
          )}
        </>
      )}
      {showBass && config.bass.alignment === 'ported' && (
        <group position={[0, portY + 0.16, depth / 2 + 0.105]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[portRadius * 1.18, portRadius * 1.18, 0.11, 48]} />
            <meshStandardMaterial color="#101110" roughness={0.34} />
          </mesh>
          <mesh position={[0, 0, -portTubeDepth / 2]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[portRadius, portRadius, portTubeDepth, 48]} />
            <meshStandardMaterial color="#050605" roughness={0.3} />
          </mesh>
        </group>
      )}
      {config.cabinet.grille !== 'none' && (
        <RoundedBox
          args={[width * 0.88, height * 0.85, 0.025]}
          radius={radius}
          smoothness={4}
          position={[0, height / 2 + 0.16, depth / 2 + 0.13]}
        >
          <meshStandardMaterial
            color={config.cabinet.grille === 'perforated_metal' ? '#454542' : '#262724'}
            roughness={0.75}
            transparent
            opacity={0.35}
          />
        </RoundedBox>
      )}
      {showPersonalisation && config.personalisation.kind === 'engraving' && (
        <group position={[width / 2 + 0.014, height * 0.2 + 0.16, depth * 0.2]}>
          <mesh>
            <boxGeometry args={[0.018, 0.08, 0.18]} />
            <meshStandardMaterial color="#b99b74" roughness={0.45} />
          </mesh>
          <mesh position={[0.012, 0, 0]}>
            <boxGeometry args={[0.006, 0.018, 0.12]} />
            <meshStandardMaterial color="#272522" roughness={0.5} />
          </mesh>
        </group>
      )}
      {config.personalisation.kind === 'pattern' &&
        [-0.24, 0, 0.24].map((z) => (
          <mesh key={z} position={[width / 2 + 0.012, height * 0.5 + 0.16, z]}>
            <boxGeometry args={[0.012, height * 0.58, 0.055]} />
            <meshStandardMaterial color="#b99b74" roughness={0.56} transparent opacity={0.72} />
          </mesh>
        ))}
      {config.personalisation.kind === 'printed_panel' && (
        <RoundedBox
          args={[0.014, height * 0.52, depth * 0.62]}
          radius={0.02}
          smoothness={3}
          position={[width / 2 + 0.012, height * 0.5 + 0.16, 0]}
        >
          <meshStandardMaterial color="#47576a" roughness={0.56} />
        </RoundedBox>
      )}
      {config.personalisation.kind === 'decal' && (
        <mesh
          rotation={[0, Math.PI / 2, 0]}
          position={[width / 2 + 0.014, height * 0.3 + 0.16, depth * 0.18]}
        >
          <circleGeometry args={[0.115, 32]} />
          <meshStandardMaterial color="#d6d1c7" roughness={0.42} />
        </mesh>
      )}
      {config.personalisation.kind === 'custom_artwork' && (
        <RoundedBox
          args={[0.014, height * 0.62, depth * 0.72]}
          radius={0.02}
          smoothness={3}
          position={[width / 2 + 0.012, height * 0.5 + 0.16, 0]}
        >
          <meshStandardMaterial color="#7a4e5b" roughness={0.46} />
        </RoundedBox>
      )}
    </group>
  );
}

function Capture({ onCapture }: { onCapture: (image: string) => void }) {
  const { gl } = useThree();
  useEffect(() => {
    const frame = window.requestAnimationFrame(() =>
      window.requestAnimationFrame(() => onCapture(gl.domElement.toDataURL('image/png')))
    );
    return () => window.cancelAnimationFrame(frame);
  }, [gl, onCapture]);
  return null;
}

export default function ProceduralSpeaker({
  config,
  view = 'interactive',
  onCapture,
  showDrivers = true,
  showBass = true,
  showPersonalisation = true,
}: {
  config: CustomSpeakerConfiguration;
  view?: 'interactive' | 'front' | 'rear';
  onCapture?: (image: string) => void;
  showDrivers?: boolean;
  showBass?: boolean;
  showPersonalisation?: boolean;
}) {
  const format = config.brief?.format ?? 'standmount';
  const height =
    (format === 'subwoofer' ? 2.15 : format === 'floorstanding' ? 3.55 : 2.75) *
    (config.cabinet.size === 'compact' ? 0.84 : config.cabinet.size === 'large' ? 1.18 : 1);
  const baseLift = config.cabinet.base === 'stand' ? 0.55 : 0;
  const target: [number, number, number] = [0, height * 0.48 + 0.12 + baseLift, 0];
  const camera: [number, number, number] = view === 'rear' ? [-5.2, 3.1, -7.2] : [5.2, 3.1, 7.2];
  return (
    <Canvas
      shadows
      dpr={view === 'interactive' ? [1, 1.6] : 2}
      gl={{ preserveDrawingBuffer: Boolean(onCapture) }}
      camera={{ position: camera, fov: 35 }}
    >
      <color attach="background" args={['#e4e1da']} />
      <ambientLight intensity={1.15} />
      <directionalLight
        position={[3, 6, 5]}
        intensity={3.4}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <directionalLight position={[-4, 3, 1]} intensity={0.8} />
      <SpeakerModel
        config={config}
        showDrivers={showDrivers}
        showBass={showBass}
        showPersonalisation={showPersonalisation}
      />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[10, 10]} />
        <shadowMaterial opacity={0.12} />
      </mesh>
      <ContactShadows position={[0, 0.01, 0]} opacity={0.3} scale={5.5} blur={2.2} far={5} />
      <Environment preset="studio" />
      {view === 'interactive' ? (
        <OrbitControls
          target={target}
          enablePan={false}
          minDistance={4.6}
          maxDistance={10}
          minPolarAngle={Math.PI / 3.2}
          maxPolarAngle={Math.PI / 1.85}
        />
      ) : onCapture ? (
        <Capture onCapture={onCapture} />
      ) : null}
    </Canvas>
  );
}
