import { useState } from 'react';
import type { Product } from '../App';

type Props = { products: Product[]; onBack: () => void; onPreview: (product: Product) => void };

export default function ComparisonPage({ products, onBack, onPreview }: Props) {
  const [selected, setSelected] = useState<Product[]>(products.slice(0, 2));
  const add = (product: Product) => setSelected((items) => items.some((item) => item.name === product.name) ? items : [...items.slice(-1), product]);
  const labels = Array.from(new Set(selected.flatMap((product) => product.specs.map(([label]) => label))));
  return <main className="comparison-page"><button className="back-link" onClick={onBack}>← Back to collection</button><p className="eyebrow">Find your fit</p><h1>Compare the<br /><em>collection.</em></h1><p className="comparison-intro">Place two speakers side by side, then take either one into the listening lab.</p><div className="compare-picker">{products.map((product) => <button key={product.name} className={selected.some((item) => item.name === product.name) ? 'selected' : ''} onClick={() => add(product)}>{product.name}</button>)}</div><section className="comparison-table"><div className="compare-row compare-head"><span>Model</span>{selected.map((product) => <strong key={product.name}>{product.name}<small>{product.type}</small></strong>)}</div>{labels.map((label) => <div className="compare-row" key={label}><span>{label}</span>{selected.map((product) => <strong key={product.name}>{product.specs.find(([spec]) => spec === label)?.[1] ?? '—'}</strong>)}</div>)}<div className="compare-row compare-actions"><span>Listening lab</span>{selected.map((product) => <button key={product.name} onClick={() => onPreview(product)}>Preview {product.name} →</button>)}</div></section></main>;
}
