import { useState } from 'react';
import type { Product } from '../App';
import { readLocalBuilds } from '../lib/localBuilds';

type Props = { products: Product[]; onBack: () => void; onPreview: (product: Product) => void };
type Comparable = { id: string; name: string; type: string; specs: [string, string][]; product?: Product };

export default function ComparisonPage({ products, onBack, onPreview }: Props) {
  const localBuilds = readLocalBuilds()?.builds ?? [];
  const catalog: Comparable[] = products.map((product) => ({ id: `catalog:${product.name}`, name: product.name, type: product.type, specs: product.specs, product }));
  const custom: Comparable[] = localBuilds.map((build) => ({ id: `custom:${build.id}`, name: build.name, type: 'Custom design', specs: [
    ['Platform', build.configuration.platformId.replaceAll('_', ' ')], ['Format', build.configuration.brief.format], ['Alignment', build.configuration.bass.alignment], ['Bass character', build.configuration.bass.bassCharacter], ['Net volume', `${build.configuration.bass.netVolumeLitres ?? '—'} L`], ['Port tuning', build.configuration.bass.tuningHz ? `${build.configuration.bass.tuningHz} Hz` : 'Sealed'], ['Finish', build.configuration.cabinet.finish.replaceAll('_', ' ')], ['Simulation profile', build.simulationProfile?.referenceName ?? 'Not validated'],
  ] }));
  const choices = [...custom, ...catalog];
  const [selected, setSelected] = useState<Comparable[]>(() => choices.slice(0, 2));
  const add = (item: Comparable) => setSelected((items) => items.some((candidate) => candidate.id === item.id) ? items : [...items.slice(-1), item]);
  const labels = Array.from(new Set(selected.flatMap((product) => product.specs.map(([label]) => label))));
  return <main className="comparison-page"><button className="back-link" onClick={onBack}>← Back to collection</button><p className="eyebrow">Find your fit</p><h1>Compare the<br /><em>collection.</em></h1><p className="comparison-intro">Place two speakers side by side, including designs saved only on this device.</p><div className="compare-picker">{choices.map((item) => <button key={item.id} className={selected.some((candidate) => candidate.id === item.id) ? 'selected' : ''} onClick={() => add(item)}>{item.name}</button>)}</div><section className="comparison-table"><div className="compare-row compare-head"><span>Model</span>{selected.map((item) => <strong key={item.id}>{item.name}<small>{item.type}</small></strong>)}</div>{labels.map((label) => <div className="compare-row" key={label}><span>{label}</span>{selected.map((item) => <strong key={item.id}>{item.specs.find(([spec]) => spec === label)?.[1] ?? '—'}</strong>)}</div>)}<div className="compare-row compare-actions"><span>Listening lab</span>{selected.map((item) => item.product ? <button key={item.id} onClick={() => onPreview(item.product!)}>Preview {item.name} →</button> : <strong key={item.id}>Validate in builder</strong>)}</div></section></main>;
}
