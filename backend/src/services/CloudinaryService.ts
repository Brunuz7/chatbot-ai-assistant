import { v2 as cloudinary } from 'cloudinary';

export type CloudinaryAccountIndex = 0 | 1;

type CloudinaryAccount = {
  index: CloudinaryAccountIndex;
  cloudName: string;
  apiKey: string;
  apiSecret: string;
};

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

/** Contador em memória para balancear uso entre contas free. */
const accountUsage: Record<CloudinaryAccountIndex, number> = { 0: 0, 1: 0 };

function readAccount(index: CloudinaryAccountIndex): CloudinaryAccount | null {
  const n = index + 1;
  const cloudName = process.env[`CLOUDINARY_ACCOUNT_${n}_CLOUD_NAME`]?.trim();
  const apiKey = process.env[`CLOUDINARY_ACCOUNT_${n}_API_KEY`]?.trim();
  const apiSecret = process.env[`CLOUDINARY_ACCOUNT_${n}_API_SECRET`]?.trim();
  if (!cloudName || !apiKey || !apiSecret) return null;
  return { index, cloudName, apiKey, apiSecret };
}

function configuredAccounts(): CloudinaryAccount[] {
  return ([0, 1] as const).map(readAccount).filter((a): a is CloudinaryAccount => a !== null);
}

function configureAccount(account: CloudinaryAccount) {
  cloudinary.config({
    cloud_name: account.cloudName,
    api_key: account.apiKey,
    api_secret: account.apiSecret,
    secure: true,
  });
}

function isQuotaError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /quota|limit|storage|bandwidth|402|403|429/i.test(msg);
}

export class CloudinaryService {
  static isConfigured(): boolean {
    return configuredAccounts().length > 0;
  }

  static getPublicCloudNames(): string[] {
    const names = configuredAccounts().map((a) => a.cloudName);
    return [names[0] ?? '', names[1] ?? ''];
  }

  static syncUsageFromImageRefs(refs: { a: CloudinaryAccountIndex }[]) {
    accountUsage[0] = 0;
    accountUsage[1] = 0;
    for (const ref of refs) {
      if (ref.a === 0 || ref.a === 1) accountUsage[ref.a]++;
    }
  }

  static pickAccount(preferred?: CloudinaryAccountIndex): CloudinaryAccountIndex {
    const accounts = configuredAccounts();
    if (accounts.length === 0) throw new Error('cloudinary_not_configured');
    if (accounts.length === 1) return accounts[0].index;
    if (preferred != null && accounts.some((a) => a.index === preferred)) return preferred;
    return accountUsage[0] <= accountUsage[1] ? 0 : 1;
  }

  static buildCdnUrl(accountIndex: CloudinaryAccountIndex, publicId: string, transform = 'c_fill,w_400,h_300,q_auto,f_auto'): string {
    const account = readAccount(accountIndex);
    if (!account) return '';
    const tx = transform ? `${transform}/` : '';
    return `https://res.cloudinary.com/${account.cloudName}/image/upload/${tx}${publicId}`;
  }

  static slugifyProductName(name: string): string {
    const slug = name
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48);
    return slug || 'produto';
  }

  static buildPublicId(userId: string, productName: string, slot: number): string {
    const slug = CloudinaryService.slugifyProductName(productName);
    return `${userId}/${slug}/${slot}_${Date.now()}`;
  }

  static assertOwnedPublicId(userId: string, publicId: string) {
    const prefix = `${userId}/`;
    if (!publicId.startsWith(prefix)) throw new Error('forbidden_image');
  }

  static async uploadProductImage(
    userId: string,
    productName: string,
    slot: number,
    buffer: Buffer,
    mimeType: string,
  ): Promise<{ account: CloudinaryAccountIndex; publicId: string; url: string }> {
    if (!ALLOWED_MIMES.has(mimeType)) throw new Error('invalid_image_type');
    if (buffer.length > MAX_IMAGE_BYTES) throw new Error('image_too_large');

    const accounts = configuredAccounts();
    if (accounts.length === 0) throw new Error('cloudinary_not_configured');

    const publicId = CloudinaryService.buildPublicId(userId, productName, slot);
    const first = CloudinaryService.pickAccount();
    const order = [first, ...accounts.map((a) => a.index).filter((i) => i !== first)];
    const uniqueOrder = [...new Set(order)] as CloudinaryAccountIndex[];

    let lastError: unknown;
    for (const index of uniqueOrder) {
      const account = readAccount(index);
      if (!account) continue;
      try {
        configureAccount(account);
        const result = await cloudinary.uploader.upload(`data:${mimeType};base64,${buffer.toString('base64')}`, {
          public_id: publicId,
          overwrite: false,
          resource_type: 'image',
          transformation: [{ width: 720, height: 720, crop: 'limit', quality: 'auto:good', fetch_format: 'auto' }],
        });
        accountUsage[index]++;
        return {
          account: index,
          publicId: result.public_id,
          url: result.secure_url,
        };
      } catch (err) {
        lastError = err;
        if (!isQuotaError(err)) break;
      }
    }

    console.error('Cloudinary upload failed:', lastError);
    throw new Error('cloudinary_upload_failed');
  }

  static async deleteProductImage(userId: string, accountIndex: CloudinaryAccountIndex, publicId: string) {
    CloudinaryService.assertOwnedPublicId(userId, publicId);
    const account = readAccount(accountIndex);
    if (!account) throw new Error('cloudinary_not_configured');

    configureAccount(account);
    try {
      await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
      accountUsage[accountIndex] = Math.max(0, accountUsage[accountIndex] - 1);
    } catch (err) {
      console.error('Cloudinary delete failed:', err);
      throw new Error('cloudinary_delete_failed');
    }
  }
}

export { MAX_IMAGE_BYTES, ALLOWED_MIMES };
