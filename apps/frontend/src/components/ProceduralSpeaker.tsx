import { Canvas, useThree } from '@react-three/fiber';
import { ContactShadows, Environment, OrbitControls, RoundedBox } from '@react-three/drei';
import { useEffect } from 'react';
import type { CustomSpeakerConfiguration } from '@acoustom/types';

const finishes: Record<string, [string, number]> = { walnut: ['#8b5936', 0.38], oak: ['#a6794e', 0.4], black_ash: ['#20211f', 0.5], satin_white: ['#dedbd3', 0.28], satin_black: ['#171716', 0.3], deep_blue: ['#1e314a', 0.35], custom_colour: ['#8a8176', 0.35] };

function Material({ finish, transparent = false, opacity = 1 }: { finish: string; transparent?: boolean; opacity?: number }) { const [color, roughness] = finishes[finish] ?? finishes.walnut; return <meshStandardMaterial color={color} roughness={roughness} metalness={0.02} transparent={transparent} opacity={opacity} depthWrite={!transparent} />; }

function Screw({ position, rotation = [0, 0, 0] }: { position: [number, number, number]; rotation?: [number, number, number] }) { return <mesh position={position} rotation={rotation}><cylinderGeometry args={[0.035, 0.035, 0.012, 16]} /><meshStandardMaterial color="#090a09" roughness={0.28} /></mesh>; }

function Driver({ position, radius, selected, onSelect, screws = true }: { position: [number, number, number]; radius: number; selected: boolean; onSelect: () => void; screws?: boolean }) {
  const screwPositions: [number, number, number][] = [[radius * .82, radius * .82, .13], [-radius * .82, radius * .82, .13], [radius * .82, -radius * .82, .13], [-radius * .82, -radius * .82, .13]];
  return <group position={position} onClick={(event) => { event.stopPropagation(); onSelect(); }}>
    <mesh rotation={[Math.PI / 2, 0, 0]} castShadow><cylinderGeometry args={[radius * 1.12, radius * 1.12, .075, 64]} /><meshStandardMaterial color={selected ? '#b99b74' : '#292a28'} roughness={.32} /></mesh>
    <mesh position={[0, 0, .045]} rotation={[Math.PI / 2, 0, 0]} castShadow><cylinderGeometry args={[radius * .88, radius * .88, .06, 64]} /><meshStandardMaterial color="#101110" roughness={.24} /></mesh>
    <mesh position={[0, 0, .09]} rotation={[Math.PI / 2, 0, 0]} castShadow><cylinderGeometry args={[radius * .7, radius * .6, .035, 64]} /><meshStandardMaterial color={radius > .4 ? '#191a18' : '#252624'} roughness={.3} /></mesh>
    <mesh position={[0, 0, .13]}><sphereGeometry args={[radius * .27, 32, 16]} /><meshStandardMaterial color="#5c5b55" roughness={.18} /></mesh>
    {screws && screwPositions.map((p, i) => <Screw key={i} position={p} />)}
  </group>;
}

function Damping({ height, depth, width }: { height: number; depth: number; width: number }) { return <group>{[.46, 1.02, 1.58, 2.14, 2.7].filter((y) => y < height - .15).map((y, index) => <mesh key={index} position={[width * .18, y + .16, -depth * .15]} rotation={[0, .2, 0]}><dodecahedronGeometry args={[.2, 1]} /><meshStandardMaterial color="#dedbd0" roughness={1} transparent opacity={.74} /></mesh>)}</group>; }

export function SpeakerModel({ config }: { config: CustomSpeakerConfiguration }) {
  // Keep the canvas usable while a configuration is being assembled or replaced by HMR.
  const format = config.brief?.format ?? 'standmount';
  const subwoofer = format === 'subwoofer'; const tall = format === 'floorstanding' || subwoofer; const scale = config.cabinet.size === 'compact' ? .84 : config.cabinet.size === 'large' ? 1.18 : 1; const height = (subwoofer ? 2.15 : tall ? 3.55 : 2.75) * scale; const width = (subwoofer ? 2.05 : tall ? 1.48 : 1.82) * scale; const depth = (subwoofer ? 1.3 : 1.04) * scale; const shell = .09; const tweeterY = height - .62; const wooferY = tall ? 1.2 : 1; const portY = .32; const radius = config.cabinet.edgeProfile === 'sculpted_radius' ? .12 : .045;
  const portRadius = Math.min(width * .16, Math.max(.09, (config.bass.portInnerDiameterMm ?? 50) / 250)); const portTubeDepth = Math.min(depth * .55, Math.max(.11, (config.bass.portLengthMm ?? 120) / 450));
  return <group position={[0, .12, 0]}>
    {config.cabinet.base === 'plinth' && <RoundedBox args={[width + .25, .16, depth + .25]} radius={.035} smoothness={4} position={[0, .08, 0]} castShadow><Material finish="black_ash" /></RoundedBox>}
    {config.cabinet.base === 'slim_feet' && [-1, 1].map((x) => <mesh key={x} position={[x * width * .36, .08, 0]} castShadow><boxGeometry args={[.08, .16, depth * .7]} /><meshStandardMaterial color="#242421" roughness={.4} /></mesh>)}
    <RoundedBox args={[width, height, shell]} radius={radius} smoothness={4} position={[0, height / 2 + .16, -depth / 2 + shell / 2]} castShadow><Material finish={config.cabinet.finish} transparent opacity={.2} /></RoundedBox>
    <RoundedBox args={[shell, height, depth]} radius={radius} smoothness={4} position={[-width / 2 + shell / 2, height / 2 + .16, 0]} castShadow><Material finish={config.cabinet.finish} /></RoundedBox>
    <RoundedBox args={[shell, height, depth]} radius={radius} smoothness={4} position={[width / 2 - shell / 2, height / 2 + .16, 0]} castShadow><Material finish={config.cabinet.finish} transparent opacity={.18} /></RoundedBox>
    <RoundedBox args={[width, shell, depth]} radius={radius} smoothness={4} position={[0, height + .16 - shell / 2, 0]} castShadow><Material finish={config.cabinet.finish} transparent opacity={.22} /></RoundedBox>
    <RoundedBox args={[width, shell, depth]} radius={radius} smoothness={4} position={[0, .16 + shell / 2, 0]} castShadow><Material finish={config.cabinet.finish} /></RoundedBox>
    <RoundedBox args={[width * .91, height, .075]} radius={radius} smoothness={4} position={[0, height / 2 + .16, depth / 2 + .035]} castShadow><Material finish="black_ash" /></RoundedBox>
    <mesh position={[0, height * .52 + .16, 0]} castShadow><boxGeometry args={[width - .16, .08, depth - .16]} /><Material finish={config.cabinet.finish} /></mesh>
    <mesh position={[0, height * .14 + .16, 0]} castShadow><boxGeometry args={[width - .16, .08, depth - .16]} /><Material finish={config.cabinet.finish} /></mesh>
    <Damping height={height} depth={depth} width={width} />
    {!subwoofer && <Driver position={[0, tweeterY + .16, depth / 2 + .1]} radius={.28} selected={false} onSelect={() => undefined} />}
    <Driver position={[0, wooferY + .16, depth / 2 + .1]} radius={subwoofer ? width * .33 : tall ? .54 : .62} selected={false} onSelect={() => undefined} />
    {config.platformId === 'three_way_reference' && <Driver position={[0, height * .52 + .16, depth / 2 + .1]} radius={.34} selected={false} onSelect={() => undefined} />}
    {config.bass.alignment === 'ported' && <group position={[0, portY + .16, depth / 2 + .105]}><mesh rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[portRadius * 1.18, portRadius * 1.18, .11, 48]} /><meshStandardMaterial color="#101110" roughness={.34} /></mesh><mesh position={[0, 0, -portTubeDepth / 2]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[portRadius, portRadius, portTubeDepth, 48]} /><meshStandardMaterial color="#050605" roughness={.3} /></mesh></group>}
    {config.cabinet.grille !== 'none' && <RoundedBox args={[width * .88, height * .85, .025]} radius={radius} smoothness={4} position={[0, height / 2 + .16, depth / 2 + .13]}><meshStandardMaterial color={config.cabinet.grille === 'perforated_metal' ? '#454542' : '#262724'} roughness={.75} transparent opacity={.35} /></RoundedBox>}
  </group>;
}

function Capture({ onCapture }: { onCapture: (image: string) => void }) { const { gl } = useThree(); useEffect(() => { const frame = window.requestAnimationFrame(() => window.requestAnimationFrame(() => onCapture(gl.domElement.toDataURL('image/png')))); return () => window.cancelAnimationFrame(frame); }, [gl, onCapture]); return null; }

export default function ProceduralSpeaker({ config, view = 'interactive', onCapture }: { config: CustomSpeakerConfiguration; view?: 'interactive' | 'front' | 'rear'; onCapture?: (image: string) => void }) { const format = config.brief?.format ?? 'standmount'; const height = (format === 'subwoofer' ? 2.15 : format === 'floorstanding' ? 3.55 : 2.75) * (config.cabinet.size === 'compact' ? .84 : config.cabinet.size === 'large' ? 1.18 : 1); const target: [number, number, number] = [0, height * .48 + .12, 0]; const camera: [number, number, number] = view === 'rear' ? [-3.75, 2.25, -5.2] : [3.75, 2.1, 5.2]; return <Canvas shadows dpr={view === 'interactive' ? [1, 1.6] : 2} gl={{ preserveDrawingBuffer: Boolean(onCapture) }} camera={{ position: camera, fov: 35 }}><color attach="background" args={['#e4e1da']} /><ambientLight intensity={1.15} /><directionalLight position={[3, 6, 5]} intensity={3.4} castShadow shadow-mapSize={[1024, 1024]} /><directionalLight position={[-4, 3, 1]} intensity={.8} /><SpeakerModel config={config} /><mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -.01, 0]} receiveShadow><planeGeometry args={[10, 10]} /><shadowMaterial opacity={.12} /></mesh><ContactShadows position={[0, .01, 0]} opacity={.3} scale={4.5} blur={2.2} far={4} /><Environment preset="studio" />{view === 'interactive' ? <OrbitControls target={target} enablePan={false} minDistance={3.5} maxDistance={7.5} minPolarAngle={Math.PI / 3.2} maxPolarAngle={Math.PI / 1.85} /> : onCapture ? <Capture onCapture={onCapture} /> : null}</Canvas>; }
