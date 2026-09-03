import { apiUrl } from './api';

export type CatalogProduct = {
  id: string;
  name: string;
  type: string;
  image: string;
  price: string;
  tone: string;
  category: string;
  description: string;
  specs: [string, string][];
};

export async function fetchCatalog(signal?: AbortSignal): Promise<CatalogProduct[]> {
  const response = await fetch(apiUrl('/api/speakers/catalog'), {
    signal,
    cache: 'no-store',
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Catalog unavailable (${response.status}): ${detail || response.statusText}`);
  }
  const payload = (await response.json()) as { products?: CatalogProduct[] };
  if (!Array.isArray(payload.products)) throw new Error('Catalog response is invalid');
  return payload.products;
}
