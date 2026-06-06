import { decode, encode } from '@toon-format/toon';

export type CloudinaryAccountIndex = 0 | 1;

/** Referência compacta: conta Cloudinary + public_id. */
export type StoreProductImage = {
  a: CloudinaryAccountIndex;
  p: string;
};

export type StoreProduct = {
  id: string;
  name: string;
  price: number;
  description: string;
  im?: StoreProductImage[];
};

export const STORE_CATEGORY = 'loja integrada';
export const STORE_CATALOG_TITLE = 'Catálogo de produtos';

export const STORE_CATALOG_FORMAT_PREFIX = /^(json|csv|toon)\n/s;
export const STORE_IMAGE_REF_PATTERN = /^[01]:[a-zA-Z0-9_\-/.]+$/;
const MAX_IMAGES_PER_PRODUCT = 2;

type StoreCatalogFormat = 'json' | 'csv' | 'toon';

const CSV_HEADER = 'id,name,price,description,im';

function escapeCsvField(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function parseCsvRow(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else inQuotes = false;
      } else current += ch;
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      continue;
    }
    if (ch === ',') {
      fields.push(current);
      current = '';
      continue;
    }
    current += ch;
  }
  fields.push(current);
  return fields;
}

function compactImageRef(img: StoreProductImage): string {
  return `${img.a}:${img.p}`;
}

function parseImageRef(raw: unknown): StoreProductImage | null {
  if (typeof raw === 'string') {
    if (!STORE_IMAGE_REF_PATTERN.test(raw)) return null;
    const sep = raw.indexOf(':');
    const a = Number(raw.slice(0, sep));
    const p = raw.slice(sep + 1);
    if (a !== 0 && a !== 1) return null;
    return { a: a as CloudinaryAccountIndex, p };
  }
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  const a = Number(row.a ?? row.account);
  const p = String(row.p ?? row.publicId ?? '').trim();
  if ((a !== 0 && a !== 1) || !p || !STORE_IMAGE_REF_PATTERN.test(`${a}:${p}`)) return null;
  return { a: a as CloudinaryAccountIndex, p };
}

function normalizeImages(raw: unknown): StoreProductImage[] | undefined {
  if (raw == null) return undefined;
  if (!Array.isArray(raw)) return undefined;
  const images = raw.map(parseImageRef).filter((img): img is StoreProductImage => img !== null).slice(0, MAX_IMAGES_PER_PRODUCT);
  return images.length ? images : undefined;
}

function normalizeProduct(raw: unknown): StoreProduct | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  const name = String(row.name ?? '').trim();
  if (!name) return null;
  const priceRaw = row.price;
  const price =
    typeof priceRaw === 'number' && Number.isFinite(priceRaw)
      ? priceRaw
      : Number(String(priceRaw ?? '').replace(',', '.'));
  if (!Number.isFinite(price) || price < 0) return null;
  const id = String(row.id ?? '').trim() || crypto.randomUUID();
  const im = normalizeImages(row.im ?? row.images);
  return {
    id,
    name,
    price,
    description: String(row.description ?? '').trim(),
    ...(im ? { im } : {}),
  };
}

function compactProductsForStorage(products: StoreProduct[]): Record<string, unknown>[] {
  return products.map((p) => ({
    id: p.id,
    name: p.name,
    price: p.price,
    description: p.description,
    ...(p.im?.length ? { im: p.im.map(compactImageRef) } : {}),
  }));
}

function productsFromJson(payload: string): StoreProduct[] {
  const parsed = JSON.parse(payload) as unknown;
  if (!Array.isArray(parsed)) return [];
  return parsed.map(normalizeProduct).filter((p): p is StoreProduct => p !== null);
}

function productsFromCsv(payload: string): StoreProduct[] {
  const lines = payload
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length <= 1) return [];
  return lines
    .slice(1)
    .map((line) => {
      const [id, name, priceRaw, description = '', imRaw = ''] = parseCsvRow(line);
      let im: StoreProductImage[] | undefined;
      if (imRaw.trim()) {
        try {
          im = normalizeImages(JSON.parse(imRaw));
        } catch {
          im = normalizeImages(imRaw.split('|').filter(Boolean));
        }
      }
      return normalizeProduct({ id, name, price: priceRaw, description, im });
    })
    .filter((p): p is StoreProduct => p !== null);
}

function productsFromToon(payload: string): StoreProduct[] {
  const parsed = decode(payload) as { products?: unknown };
  if (!Array.isArray(parsed?.products)) return [];
  return parsed.products.map(normalizeProduct).filter((p): p is StoreProduct => p !== null);
}

function toJson(products: StoreProduct[]): string {
  return JSON.stringify(compactProductsForStorage(products));
}

function toCsv(products: StoreProduct[]): string {
  const rows = products.map((p) => {
    const im = p.im?.length ? JSON.stringify(p.im.map(compactImageRef)) : '';
    return [p.id, escapeCsvField(p.name), p.price, escapeCsvField(p.description), escapeCsvField(im)].join(',');
  });
  return [CSV_HEADER, ...rows].join('\n');
}

function toToon(products: StoreProduct[]): string {
  return encode({ products: compactProductsForStorage(products) });
}

function pickSmallestPayload(products: StoreProduct[]): { format: StoreCatalogFormat; payload: string } {
  const candidates: { format: StoreCatalogFormat; payload: string }[] = [
    { format: 'json', payload: toJson(products) },
    { format: 'csv', payload: toCsv(products) },
    { format: 'toon', payload: toToon(products) },
  ];
  return candidates.reduce((best, cur) => (cur.payload.length < best.payload.length ? cur : best));
}

export function isValidStoreCatalogContent(content: string): boolean {
  const trimmed = content.trim();
  if (!trimmed) return true;
  if (!STORE_CATALOG_FORMAT_PREFIX.test(trimmed)) return false;
  try {
    decodeStoreCatalog(trimmed);
    return true;
  } catch {
    return false;
  }
}

/** Serializa o catálogo no formato (json, csv ou toon) que ocupa menos caracteres. */
export function encodeStoreCatalog(products: StoreProduct[]): string {
  for (const p of products) {
    if (p.im && p.im.length > MAX_IMAGES_PER_PRODUCT) throw new Error('too_many_images');
    if (p.im?.some((img) => !STORE_IMAGE_REF_PATTERN.test(compactImageRef(img)))) throw new Error('invalid_image_ref');
  }
  const { format, payload } = pickSmallestPayload(products);
  return `${format}\n${payload}`;
}

/** Converte o conteúdo armazenado na base de conhecimento em lista de produtos. */
export function decodeStoreCatalog(content: string): StoreProduct[] {
  const trimmed = content.trim();
  if (!trimmed) return [];

  const newline = trimmed.indexOf('\n');
  if (newline === -1 || !STORE_CATALOG_FORMAT_PREFIX.test(trimmed)) {
    throw new Error('invalid_catalog_format');
  }

  const format = trimmed.slice(0, newline).trim() as StoreCatalogFormat;
  const payload = trimmed.slice(newline + 1);
  if (format !== 'json' && format !== 'csv' && format !== 'toon') throw new Error('invalid_catalog_format');

  let products: StoreProduct[];
  if (format === 'json') products = productsFromJson(payload);
  else if (format === 'csv') products = productsFromCsv(payload);
  else products = productsFromToon(payload);

  for (const p of products) {
    if (p.im && p.im.length > MAX_IMAGES_PER_PRODUCT) throw new Error('invalid_catalog_format');
    if (p.im?.some((img) => !STORE_IMAGE_REF_PATTERN.test(compactImageRef(img)))) throw new Error('invalid_catalog_format');
  }

  return products;
}

export function formatStorePrice(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export const STORE_IMAGE_TRANSFORM_CARD = 'c_fill,w_400,h_300,q_auto,f_auto';
export const STORE_IMAGE_TRANSFORM_THUMB = 'c_fill,w_72,h_72,q_auto,f_auto';
export const STORE_IMAGE_TRANSFORM_FORM = 'c_fill,w_160,h_160,q_auto,f_auto';

export function buildProductImageCdnUrl(
  image: StoreProductImage,
  cloudNames: string[],
  transform = STORE_IMAGE_TRANSFORM_CARD,
): string {
  const cloud = cloudNames[image.a]?.trim();
  if (!cloud || !STORE_IMAGE_REF_PATTERN.test(compactImageRef(image))) return '';
  const tx = transform ? `${transform}/` : '';
  return `https://res.cloudinary.com/${cloud}/image/upload/${tx}${image.p}`;
}

export function imageRefsEqual(a: StoreProductImage, b: StoreProductImage): boolean {
  return a.a === b.a && a.p === b.p;
}

export { MAX_IMAGES_PER_PRODUCT };
