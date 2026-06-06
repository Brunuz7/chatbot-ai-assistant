export type StoreProductImage = {
  a: 0 | 1;
  p: string;
};

export type StoreProduct = {
  id: string;
  name: string;
  price: number;
  description: string;
  im?: StoreProductImage[];
};

export type StoreProductImageDelivery = {
  url: string;
  caption: string;
};
