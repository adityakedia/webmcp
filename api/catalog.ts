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

  const connectionString = process.env.DATABASE_URL ?? process.env.NEON_DATA_API_URL;
  if (!connectionString) {
    response.status(500).json({ error: 'DATABASE_URL is not configured' });
    return;
  }

  try {
    const sql = neon(connectionString);
    const products = await sql`
      SELECT id, name, type, price, image, tone, category, description, specs
      FROM speakers
      ORDER BY id
    `;
    response.status(200).json({ products: products as CatalogRow[] });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown database error';
    response.status(500).json({ error: message });
  }
}
import { neon } from '@neondatabase/serverless';
