type CatalogRow = {
  id: string;
  name: string;
  type: string;
  price: string;
  image: string;
  tone: string;
  category: string;
  description: string;
  specs: [string, string][];
};

type VercelRequest = { method?: string };
type VercelResponse = {
  status: (code: number) => VercelResponse;
  json: (body: unknown) => void;
};

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'GET') {
    response.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const dataApiUrl = process.env.NEON_DATA_API_URL;
  if (!dataApiUrl) {
    response.status(500).json({ error: 'NEON_DATA_API_URL is not configured' });
    return;
  }

  const url = `${dataApiUrl.replace(/\/$/, '')}/speakers?select=*&order=id.asc`;
  const upstream = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!upstream.ok) {
    response.status(502).json({ error: `Catalog database returned ${upstream.status}` });
    return;
  }
  response.status(200).json({ products: (await upstream.json()) as CatalogRow[] });
}
