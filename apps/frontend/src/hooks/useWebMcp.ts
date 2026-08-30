import { useEffect, useRef, useState } from 'react';

type Product = { name: string; type: string; price: string; tone: string; category: string; description: string; specs: [string, string][] };
export type CartItem = { productName: string; quantity: number };
type Options = { products: Product[]; getCart: () => CartItem[]; getLiked: () => string[]; addToCart: (name: string, quantity: number) => CartItem[]; updateCartQuantity: (name: string, quantity: number) => CartItem[]; removeFromCart: (name: string) => CartItem[]; toggleLike: (name: string) => boolean };
export type WebMcpStatus = { state: 'checking' | 'unsupported' | 'registering' | 'ready' | 'error'; secureContext: boolean; registeredTools: string[]; toolChanges: number; error: string | null };
type Tool = { name: string; title?: string; description: string; inputSchema: Record<string, unknown>; annotations?: { readOnlyHint?: boolean; untrustedContentHint?: boolean }; execute: (input: Record<string, unknown>, options: { signal: AbortSignal }) => unknown | Promise<unknown> };
const noArgs = { type: 'object', properties: {}, additionalProperties: false };

export function useWebMcp(options: Options): WebMcpStatus {
  const latest = useRef(options);
  latest.current = options;
  const [status, setStatus] = useState<WebMcpStatus>({ state: 'checking', secureContext: false, registeredTools: [], toolChanges: 0, error: null });

  useEffect(() => {
    const secureContext = window.isSecureContext;
    const context = document.modelContext;
    if (!secureContext || !context || typeof context.registerTool !== 'function') {
      setStatus({ state: 'unsupported', secureContext, registeredTools: [], toolChanges: 0, error: !secureContext ? 'WebMCP requires a secure context.' : 'This browser did not provide document.modelContext.' });
      return;
    }

    let active = true;
    const controller = new AbortController();
    const registeredTools: string[] = [];
    let toolChanges = 0;
    const onToolChange = () => { if (active) { toolChanges += 1; setStatus((current) => ({ ...current, toolChanges })); } };
    context.addEventListener('toolchange', onToolChange);
    setStatus({ state: 'registering', secureContext, registeredTools: [], toolChanges: 0, error: null });

    const find = (name: unknown) => typeof name === 'string' ? latest.current.products.find((item) => item.name.toLowerCase() === name.toLowerCase()) : undefined;
    const productInput = { type: 'object', properties: { productName: { type: 'string', description: 'Exact speaker name, for example Contour 20i.' } }, required: ['productName'], additionalProperties: false };
    const registerAll = async (): Promise<void> => {
      const register = async (tool: Tool) => { await context.registerTool(tool, { signal: controller.signal }); registeredTools.push(tool.name); if (active) setStatus((current) => ({ ...current, registeredTools: [...registeredTools] })); };
      await register({ name: 'list_products', title: 'List speakers', description: 'List speakers in the current Acoustom catalog.', inputSchema: noArgs, annotations: { readOnlyHint: true }, execute: async () => latest.current.products.map(({ name, type, price, tone, category }) => ({ name, type, price, tone, category })) });
      await register({ name: 'get_product', title: 'Get speaker details', description: 'Read complete details and specifications for an Acoustom speaker.', inputSchema: productInput, annotations: { readOnlyHint: true }, execute: async ({ productName }) => { const item = find(productName); if (!item) throw new Error(`Product not found: ${String(productName)}`); return item; } });
      await register({ name: 'get_cart', title: 'View shopping bag', description: 'Read the current Acoustom shopping bag.', inputSchema: noArgs, annotations: { readOnlyHint: true }, execute: async () => { const items = latest.current.getCart(); return { items, itemCount: items.reduce((total, item) => total + item.quantity, 0) }; } });
      await register({ name: 'add_to_cart', title: 'Add to bag', description: 'Add speaker pairs to the shopping bag. This changes the current bag.', inputSchema: { type: 'object', properties: { productName: { type: 'string' }, quantity: { type: 'integer', minimum: 1, maximum: 10 } }, required: ['productName'], additionalProperties: false }, execute: async ({ productName, quantity = 1 }) => { const item = find(productName); if (!item) throw new Error(`Product not found: ${String(productName)}`); if (typeof quantity !== 'number' || !Number.isInteger(quantity) || quantity < 1 || quantity > 10) throw new Error('Quantity must be an integer from 1 to 10.'); const items = latest.current.addToCart(item.name, quantity); return { ok: true, productName: item.name, quantity, items, itemCount: items.reduce((total, cartItem) => total + cartItem.quantity, 0) }; } });
      await register({ name: 'update_cart_quantity', title: 'Update bag quantity', description: 'Set the quantity of a speaker in the shopping bag. Set quantity to zero to remove it.', inputSchema: { type: 'object', properties: { productName: { type: 'string' }, quantity: { type: 'integer', minimum: 0, maximum: 10 } }, required: ['productName', 'quantity'], additionalProperties: false }, execute: async ({ productName, quantity }) => { const item = find(productName); if (!item) throw new Error(`Product not found: ${String(productName)}`); if (typeof quantity !== 'number' || !Number.isInteger(quantity) || quantity < 0 || quantity > 10) throw new Error('Quantity must be an integer from 0 to 10.'); const items = latest.current.updateCartQuantity(item.name, quantity); return { ok: true, productName: item.name, quantity, items, itemCount: items.reduce((total, cartItem) => total + cartItem.quantity, 0) }; } });
      await register({ name: 'remove_from_cart', title: 'Remove from bag', description: 'Remove a speaker completely from the shopping bag. This changes the current bag.', inputSchema: productInput, execute: async ({ productName }) => { const item = find(productName); if (!item) throw new Error(`Product not found: ${String(productName)}`); const items = latest.current.removeFromCart(item.name); return { ok: true, removedProductName: item.name, items, itemCount: items.reduce((total, cartItem) => total + cartItem.quantity, 0) }; } });
      await register({ name: 'toggle_wishlist', title: 'Toggle wishlist', description: 'Save or unsave an Acoustom speaker in the wishlist.', inputSchema: productInput, execute: async ({ productName }) => { const item = find(productName); if (!item) throw new Error(`Product not found: ${String(productName)}`); const currentlyLiked = latest.current.toggleLike(item.name); return { ok: true, productName: item.name, currentlyLiked, wishlist: latest.current.getLiked() }; } });
    };

    const registrationPromise = registerAll();
    registrationPromise.then(() => { if (active) setStatus({ state: 'ready', secureContext, registeredTools: [...registeredTools], toolChanges, error: null }); }).catch((error: unknown) => { if (active && !controller.signal.aborted) setStatus({ state: 'error', secureContext, registeredTools: [...registeredTools], toolChanges, error: error instanceof Error ? `${error.name}: ${error.message}` : String(error) }); });
    return () => { active = false; controller.abort(); context.removeEventListener('toolchange', onToolChange); };
  }, []);

  return status;
}
