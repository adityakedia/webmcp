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
  const response = await fetch('/api/catalog', { signal, cache: 'no-store' });
  if (!response.ok) throw new Error('Catalog unavailable');
  const payload = (await response.json()) as { products?: CatalogProduct[] };
  if (!Array.isArray(payload.products)) throw new Error('Catalog response is invalid');
  return payload.products;
}
