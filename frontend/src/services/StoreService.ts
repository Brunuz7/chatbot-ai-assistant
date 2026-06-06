import api from './api';
import type { StoreProductImage } from '../utils/storeCatalog';

export type CloudinaryConfig = {
  configured: boolean;
  clouds: string[];
};

export type UploadedStoreImage = StoreProductImage & { url: string };

export class StoreService {
  async getCloudinaryConfig(): Promise<CloudinaryConfig> {
    const { data } = await api.get<CloudinaryConfig>('/store/cloudinary');
    return data ?? { configured: false, clouds: ['', ''] };
  }

  async uploadImage(file: File, productName: string, slot: number): Promise<UploadedStoreImage> {
    const form = new FormData();
    form.append('file', file);
    form.append('productName', productName);
    form.append('slot', String(slot));
    const { data } = await api.post<UploadedStoreImage>('/store/images', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  }

  async deleteImage(image: StoreProductImage): Promise<void> {
    await api.delete('/store/images', { data: { a: image.a, p: image.p } });
  }
}

export const storeService = new StoreService();
