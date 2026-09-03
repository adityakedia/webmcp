import type { CustomSpeakerBuild, CustomSpeakerConfiguration } from '@acoustom/types';

export type BuildSheetRequest = {
  configuration: CustomSpeakerConfiguration;
  derived: CustomSpeakerBuild['derived'];
};
type Generator = (request: BuildSheetRequest) => Promise<string>;
let generator: Generator | null = null;

export function registerBuildSheetGenerator(next: Generator | null) {
  generator = next;
}
export function generateBuildSheet(request: BuildSheetRequest) {
  if (!generator) throw new Error('Open the custom builder before generating a build sheet.');
  return generator(request);
}

export function downloadDataUrl(dataUrl: string, filename: string) {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  link.click();
}

const loadImage = (source: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = source;
  });
const title = (value: string) =>
  value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

export async function composeBuildSheet(
  request: BuildSheetRequest,
  front: string,
  rear: string
): Promise<string> {
  const canvas = document.createElement('canvas');
  canvas.width = 2400;
  canvas.height = 1600;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas export is unavailable in this browser.');
  const [frontImage, rearImage] = await Promise.all([loadImage(front), loadImage(rear)]);
  context.fillStyle = '#f5f3ee';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = '#1d1d1b';
  context.font = '28px monospace';
  context.fillText('ACOUSTOM / CUSTOM BUILD', 110, 105);
  context.font = '72px Georgia';
  context.fillText(request.configuration.name, 110, 205);
  context.strokeStyle = '#bcb8af';
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(110, 245);
  context.lineTo(2290, 245);
  context.stroke();
  context.drawImage(frontImage, 110, 315, 1320, 920);
  context.drawImage(rearImage, 1500, 315, 790, 520);
  context.fillStyle = '#6f6a62';
  context.font = '22px monospace';
  context.fillText('FRONT THREE-QUARTER', 110, 1285);
  context.fillText('REAR THREE-QUARTER', 1500, 885);
  const rows: [string, string][] = [
    ['Platform', title(request.configuration.platformId)],
    ['Format', title(request.configuration.brief.format)],
    ['Finish', title(request.configuration.cabinet.finish)],
    ['Alignment', title(request.configuration.bass.alignment)],
    ['Net volume', `${request.configuration.bass.netVolumeLitres ?? '—'} L`],
    [
      'Port tuning',
      request.configuration.bass.tuningHz ? `${request.configuration.bass.tuningHz} Hz` : 'Sealed',
    ],
    ['Reference system', request.derived.simulationProfile.referenceName],
    ['Status', title(request.derived.simulationProfile.status)],
  ];
  rows.forEach(([label, value], index) => {
    const column = index % 2;
    const row = Math.floor(index / 2);
    const x = 110 + column * 700;
    const y = 1370 + row * 62;
    context.fillStyle = '#77736b';
    context.font = '18px monospace';
    context.fillText(label.toUpperCase(), x, y);
    context.fillStyle = '#1d1d1b';
    context.font = '26px Arial';
    context.fillText(value, x + 250, y);
  });
  context.fillStyle = '#77736b';
  context.font = '18px monospace';
  context.fillText(`GENERATED ${new Date().toLocaleDateString()}`, 110, 1540);
  return canvas.toDataURL('image/png');
}
