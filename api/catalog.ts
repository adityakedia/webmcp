import { createClient } from '@neondatabase/neon-js';

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

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'GET') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const dataApiUrl = process.env.NEON_DATA_API_URL;
  if (!dataApiUrl) {
    return Response.json({ error: 'NEON_DATA_API_URL is not configured' }, { status: 500 });
  }

  const client = createClient({
    dataApi: { url: dataApiUrl },
  });
  const { data, error } = await client.from('speakers').select('*').order('id');
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ products: data as CatalogRow[] }, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
