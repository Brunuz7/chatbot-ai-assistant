import { randomUUID } from 'crypto';
import { decode as decodeToon } from '@toon-format/toon';
import { prisma } from '../prisma.js';
import type { StoreProduct, StoreProductImage, StoreProductImageDelivery } from '../types/store.js';
import { CloudinaryService, type CloudinaryAccountIndex } from './CloudinaryService.js';
import { formatStoreCatalogBody, storeCatalogEmpty } from '../constants/prompts.js';

export class StoreService {
  static readonly category = 'loja integrada';
  static readonly maxProductsImagesPerReply = 5;

  private static readonly catalogFormatPrefix = /^(json|csv|toon)\n/s;
  private static readonly imageRefPattern = /^[01]:[a-zA-Z0-9_\-/.]+$/;
  private static readonly maxImagesPerProduct = 2;

  static async listProducts(userId: string): Promise<StoreProduct[]> {
    const row = await prisma.knowledgeBase.findFirst({
      where: { user_id: userId, category: StoreService.category },
      orderBy: { updated_at: 'desc' },
      select: { content: true },
    });
    if (!row?.content) return [];
    try {
      return StoreService.decodeCatalog(row.content);
    } catch {
      return [];
    }
  }

  static formatCatalogForPrompt(content: string): string {
    const products = StoreService.decodeCatalog(content);
    if (!products.length) return storeCatalogEmpty;

    const lines = products.map((p, index) => {
      const row = [`${index + 1}. [id:${p.id}] ${p.name} — ${StoreService.formatPrice(p.price)}`];
      if (p.description.trim()) row.push(`   ${p.description.trim()}`);
      return row.join('\n');
    });

    return formatStoreCatalogBody(lines.join('\n\n'));
  }

  static resolveProductIdsForImages(replyText: string, clientMessage: string, products: StoreProduct[]): string[] {
    const fromTags = StoreService.extractTaggedProductIds(replyText, products);
    if (fromTags.length) return fromTags;
    if (!StoreService.clientRequestedSpecificProducts(clientMessage, products)) return [];

    return StoreService.matchProductNamesInText(replyText, products);
  }

  static extractTaggedProductIds(text: string, products: StoreProduct[]): string[] {
    const ids: string[] = [];
    const seen = new Set<string>();
    const tagRe = /\[id:([^\]]+)\]/gi;

    for (const match of text.matchAll(tagRe)) {
      if (ids.length >= StoreService.maxProductsImagesPerReply) break;
      const rawId = match[1]?.trim();
      if (!rawId || seen.has(rawId)) continue;
      const resolved = StoreService.resolveProductId(rawId, products);
      if (!resolved || seen.has(resolved)) continue;
      seen.add(resolved);
      ids.push(resolved);
    }

    return ids;
  }

  static sanitizeReplyForClient(text: string): string {
    return text
      .replace(/\[id:[^\]]+\]/gi, '')
      .replace(/https?:\/\/res\.cloudinary\.com\/\S+/gi, '')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  static getProductImagesForDelivery(products: StoreProduct[], productIds: string[]): StoreProductImageDelivery[] {
    const byId = new Map(products.map((p) => [p.id, p]));
    const deliveries: StoreProductImageDelivery[] = [];

    for (const id of productIds.slice(0, StoreService.maxProductsImagesPerReply)) {
      const product = byId.get(id);
      const img = product?.im?.[0];
      if (!product || !img) continue;
      const url = CloudinaryService.buildCdnUrl(img.a, img.p, 'c_fill,w_720,h_720,q_auto,f_auto');
      if (!url) continue;
      deliveries.push({ url, caption: StoreService.buildImageCaption(product) });
    }

    return deliveries;
  }

  static getCloudinaryConfig() {
    return {
      configured: CloudinaryService.isConfigured(),
      clouds: CloudinaryService.getPublicCloudNames(),
    };
  }

  static async uploadProductImage(
    userId: string,
    data: {
      buffer?: Buffer;
      mimeType?: string;
      productName?: string;
      slot?: number;
    },
  ) {
    const buffer = data.buffer;
    const mimeType = String(data.mimeType ?? '').trim();
    const productName = String(data.productName ?? '').trim();
    const slot = Number(data.slot);

    if (!buffer?.length) throw new Error('missing_image');
    if (!productName) throw new Error('missing_product_name');
    if (!Number.isInteger(slot) || slot < 0 || slot > 1) throw new Error('invalid_slot');

    const uploaded = await CloudinaryService.uploadProductImage(userId, productName, slot, buffer, mimeType);

    return {
      a: uploaded.account,
      p: uploaded.publicId,
      url: uploaded.url,
    };
  }

  static async deleteProductImage(userId: string, data: { a?: unknown; p?: unknown }) {
    const account = Number(data.a);
    const publicId = String(data.p ?? '').trim();

    if ((account !== 0 && account !== 1) || !publicId) throw new Error('invalid_image_ref');

    await CloudinaryService.deleteProductImage(userId, account as CloudinaryAccountIndex, publicId);
  }

  static decodeCatalog(content: string): StoreProduct[] {
    const trimmed = content.trim();
    if (!trimmed) return [];

    const newline = trimmed.indexOf('\n');
    if (newline === -1 || !StoreService.catalogFormatPrefix.test(trimmed)) return [];

    const format = trimmed.slice(0, newline).trim();
    const payload = trimmed.slice(newline + 1);
    if (format === 'json') return StoreService.productsFromJson(payload);
    if (format === 'csv') return StoreService.productsFromCsv(payload);
    if (format === 'toon') return StoreService.productsFromToon(payload);
    return [];
  }

  private static normalizeText(raw: string): string {
    return raw.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
  }

  private static isGenericCatalogRequest(text: string): boolean {
    const norm = StoreService.normalizeText(text);
    const phrases = [
      'o que vendem',
      'o que voces vendem',
      'que produtos',
      'catalogo completo',
      'catálogo completo',
      'todos os produtos',
      'manda tudo',
      'lista completa',
      'ver tudo',
      'mostra tudo',
      'mostrar tudo',
      'todos os itens',
      'o que tem na loja',
      'quais produtos voces tem',
      'me manda o catalogo',
      'me mande o catalogo',
    ];
    return phrases.some((p) => norm.includes(p));
  }

  private static clientRequestedSpecificProducts(clientMessage: string, products: StoreProduct[]): boolean {
    const norm = StoreService.normalizeText(clientMessage);
    if (!norm.trim() || StoreService.isGenericCatalogRequest(clientMessage)) return false;

    for (const p of products) {
      const name = StoreService.normalizeText(p.name);
      if (name.length >= 3 && norm.includes(name)) return true;
    }

    const descTokens = new Set<string>();
    for (const p of products) {
      for (const word of StoreService.normalizeText(p.description).split(/[^\p{L}\p{N}]+/u)) {
        if (word.length >= 4) descTokens.add(word);
      }
    }
    for (const word of norm.split(/[^\p{L}\p{N}]+/u)) {
      if (word.length >= 4 && descTokens.has(word)) return true;
    }

    const intentWords = ['foto', 'imagem', 'mostra', 'mostrar', 'ver', 'quero', 'manda', 'tem', 'preco', 'valor', 'comprar'];
    return intentWords.some((w) => norm.includes(w));
  }

  private static matchProductNamesInText(text: string, products: StoreProduct[]): string[] {
    const norm = StoreService.normalizeText(text);
    const ids: string[] = [];
    const seen = new Set<string>();
    const ranked = [...products].sort((a, b) => b.name.length - a.name.length);

    for (const p of ranked) {
      if (ids.length >= StoreService.maxProductsImagesPerReply) break;
      const name = StoreService.normalizeText(p.name);
      if (name.length < 3 || !norm.includes(name) || seen.has(p.id)) continue;
      seen.add(p.id);
      ids.push(p.id);
    }

    return ids;
  }

  private static resolveProductId(rawId: string, products: StoreProduct[]): string | null {
    const exact = products.find((p) => p.id === rawId);
    if (exact) return exact.id;
    const partial = products.find((p) => p.id.startsWith(rawId) || rawId.startsWith(p.id));
    return partial?.id ?? null;
  }

  private static formatPrice(value: number): string {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  private static buildImageCaption(product: StoreProduct): string {
    const lines = [product.name.trim()];
    if (product.description.trim()) lines.push(product.description.trim());
    return lines.join('\n').slice(0, 1024);
  }

  private static parseCsvRow(line: string): string[] {
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

  private static parseImageRef(raw: unknown): StoreProductImage | null {
    if (typeof raw === 'string') {
      if (!StoreService.imageRefPattern.test(raw)) return null;
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
    if ((a !== 0 && a !== 1) || !p || !StoreService.imageRefPattern.test(`${a}:${p}`)) return null;
    return { a: a as CloudinaryAccountIndex, p };
  }

  private static normalizeImages(raw: unknown): StoreProductImage[] | undefined {
    if (!Array.isArray(raw)) return undefined;
    const images = raw
      .map((item) => StoreService.parseImageRef(item))
      .filter((img): img is StoreProductImage => img !== null)
      .slice(0, StoreService.maxImagesPerProduct);
    return images.length ? images : undefined;
  }

  private static normalizeProduct(raw: unknown): StoreProduct | null {
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
    const im = StoreService.normalizeImages(row.im ?? row.images);
    return {
      id: String(row.id ?? '').trim() || randomUUID(),
      name,
      price,
      description: String(row.description ?? '').trim(),
      ...(im ? { im } : {}),
    };
  }

  private static productsFromJson(payload: string): StoreProduct[] {
    const parsed = JSON.parse(payload) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item) => StoreService.normalizeProduct(item)).filter((p): p is StoreProduct => p !== null);
  }

  private static productsFromCsv(payload: string): StoreProduct[] {
    const lines = payload
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length <= 1) return [];
    return lines
      .slice(1)
      .map((line) => {
        const [id, name, priceRaw, description = '', imRaw = ''] = StoreService.parseCsvRow(line);
        let im: StoreProductImage[] | undefined;
        if (imRaw.trim()) {
          try {
            im = StoreService.normalizeImages(JSON.parse(imRaw));
          } catch {
            im = StoreService.normalizeImages(imRaw.split('|').filter(Boolean));
          }
        }
        return StoreService.normalizeProduct({ id, name, price: priceRaw, description, im });
      })
      .filter((p): p is StoreProduct => p !== null);
  }

  private static productsFromToon(payload: string): StoreProduct[] {
    const parsed = decodeToon(payload) as { products?: unknown };
    if (!Array.isArray(parsed?.products)) return [];
    return parsed.products
      .map((item) => StoreService.normalizeProduct(item))
      .filter((p): p is StoreProduct => p !== null);
  }
}
