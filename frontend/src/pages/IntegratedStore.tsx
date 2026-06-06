import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Layout from '../components/Layout';
import { PageHeader } from '../components/PageHeader';
import { Edit, ImagePlus, Loader2, Package, Plus, SearchX, Store, Trash2, X } from 'lucide-react';
import { EmptyState } from '../components/ui/EmptyState';
import { Button } from '../components/ui/Button';
import { FilterBar } from '../components/ui/FilterBar';
import { Input as TextInput, CurrencyInput } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { ModalForm, ModalBody, ModalSection, Modal, ModalFooterBar } from '../components/ui/Modal';
import { Skeleton } from '../components/ui/Skeleton';
import { knowledgeService } from '../services/KnowledgeService';
import { storeService } from '../services/StoreService';
import type { KbItem } from '../types/knowledge';
import {
  MAX_IMAGES_PER_PRODUCT,
  STORE_CATALOG_TITLE,
  STORE_CATEGORY,
  buildProductImageCdnUrl,
  decodeStoreCatalog,
  encodeStoreCatalog,
  formatStorePrice,
  imageRefsEqual,
  STORE_IMAGE_TRANSFORM_FORM,
  STORE_IMAGE_TRANSFORM_THUMB,
  type StoreProduct,
  type StoreProductImage,
} from '../utils/storeCatalog';
import {
  currencyDigitsToNumber,
  isValidCurrencyDigits,
  numberToCurrencyDigits,
} from '../utils/currencyMask';

/** Alinhado ao limite em `KnowledgeBaseService` (backend). */
const KNOWLEDGE_CONTENT_MAX_LENGTH = 5_000;

const emptyProductForm = { name: '', price: '', description: '' };

type FormImageSlot = {
  ref: StoreProductImage | null;
  previewUrl: string;
  uploading: boolean;
};

const emptyImageSlot = (): FormImageSlot => ({ ref: null, previewUrl: '', uploading: false });

const IntegratedStore: React.FC = () => {
  const [catalogItem, setCatalogItem] = useState<KbItem | null>(null);
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [cloudNames, setCloudNames] = useState<string[]>(['', '']);
  const [cloudConfigured, setCloudConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<StoreProduct | null>(null);
  const [form, setForm] = useState(emptyProductForm);
  const [imageSlots, setImageSlots] = useState<[FormImageSlot, FormImageSlot]>([emptyImageSlot(), emptyImageSlot()]);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const loadCatalog = useCallback(async () => {
    setLoading(true);
    try {
      const [items, cloud] = await Promise.all([knowledgeService.list(), storeService.getCloudinaryConfig()]);
      setCloudNames(cloud.clouds);
      setCloudConfigured(cloud.configured);
      const row =
        items.find((item) => item.category === STORE_CATEGORY && item.title === STORE_CATALOG_TITLE) ??
        items.find((item) => item.category === STORE_CATEGORY) ??
        null;
      setCatalogItem(row);
      setProducts(row ? decodeStoreCatalog(row.content) : []);
    } catch (e) {
      console.error(e);
      setCatalogItem(null);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  const filteredProducts = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        formatStorePrice(p.price).toLowerCase().includes(q),
    );
  }, [products, searchTerm]);

  const persistProducts = async (nextProducts: StoreProduct[]) => {
    const content = encodeStoreCatalog(nextProducts);
    if (content.length > KNOWLEDGE_CONTENT_MAX_LENGTH) {
      throw new Error(
        `O catálogo excede o limite de ${KNOWLEDGE_CONTENT_MAX_LENGTH.toLocaleString('pt-BR')} caracteres. Remova produtos ou encurte descrições.`,
      );
    }

    const payload = {
      title: STORE_CATALOG_TITLE,
      content,
      category: STORE_CATEGORY,
    };

    if (nextProducts.length === 0) {
      if (catalogItem) await knowledgeService.delete(catalogItem.id);
      await loadCatalog();
      return;
    }

    if (catalogItem) await knowledgeService.update(catalogItem.id, payload);
    else await knowledgeService.create(payload);

    await loadCatalog();
  };

  const resetForm = () => {
    setForm(emptyProductForm);
    setImageSlots([emptyImageSlot(), emptyImageSlot()]);
  };

  const openCreate = () => {
    setEditing(null);
    resetForm();
    setModalOpen(true);
  };

  const openEdit = (product: StoreProduct) => {
    setEditing(product);
    setForm({
      name: product.name,
      price: numberToCurrencyDigits(product.price),
      description: product.description,
    });
    const slots: [FormImageSlot, FormImageSlot] = [emptyImageSlot(), emptyImageSlot()];
    (product.im ?? []).slice(0, MAX_IMAGES_PER_PRODUCT).forEach((ref, index) => {
      slots[index] = {
        ref,
        previewUrl: buildProductImageCdnUrl(ref, cloudNames, STORE_IMAGE_TRANSFORM_FORM),
        uploading: false,
      };
    });
    setImageSlots(slots);
    setModalOpen(true);
  };

  const setSlot = (index: 0 | 1, patch: Partial<FormImageSlot>) => {
    setImageSlots((prev) => {
      const next: [FormImageSlot, FormImageSlot] = [...prev] as [FormImageSlot, FormImageSlot];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  };

  const removeRemoteImage = async (image: StoreProductImage) => {
    if (!cloudConfigured) return;
    try {
      await storeService.deleteImage(image);
    } catch (e) {
      console.error(e);
    }
  };

  const handleImagePick = async (index: 0 | 1, file: File | null) => {
    if (!file) return;
    const name = form.name.trim();
    if (!name) {
      alert('Informe o nome do produto antes de adicionar imagens.');
      return;
    }
    if (!cloudConfigured) {
      alert('Upload de imagens indisponível — Cloudinary não configurado no servidor.');
      return;
    }

    const previous = imageSlots[index].ref;
    setSlot(index, { uploading: true, previewUrl: URL.createObjectURL(file) });

    try {
      if (previous) await removeRemoteImage(previous);
      const uploaded = await storeService.uploadImage(file, name, index);
      setSlot(index, {
        ref: { a: uploaded.a, p: uploaded.p },
        previewUrl: uploaded.url,
        uploading: false,
      });
    } catch (e: unknown) {
      console.error(e);
      setSlot(index, emptyImageSlot());
      const msg =
        e && typeof e === 'object' && 'response' in e
          ? (e as { response?: { data?: { error?: string } } }).response?.data?.error
          : undefined;
      alert(msg ?? 'Não foi possível enviar a imagem.');
    }
  };

  const clearImageSlot = async (index: 0 | 1) => {
    const current = imageSlots[index];
    if (current.ref) await removeRemoteImage(current.ref);
    setSlot(index, emptyImageSlot());
  };

  const collectFormImages = (): StoreProductImage[] =>
    imageSlots.map((s) => s.ref).filter((ref): ref is StoreProductImage => ref !== null);

  const cleanupReplacedImages = async (nextImages: StoreProductImage[]) => {
    if (!editing?.im?.length) return;
    for (const old of editing.im) {
      if (!nextImages.some((img) => imageRefsEqual(img, old))) await removeRemoteImage(old);
    }
  };

  const saveProduct = async () => {
    const name = form.name.trim();
    const price = currencyDigitsToNumber(form.price);
    if (!name || !Number.isFinite(price) || price < 0) {
      alert('Informe nome e preço válidos.');
      return;
    }
    if (imageSlots.some((s) => s.uploading)) {
      alert('Aguarde o envio das imagens terminar.');
      return;
    }

    const im = collectFormImages();
    const product: StoreProduct = {
      id: editing?.id ?? crypto.randomUUID(),
      name,
      price,
      description: form.description.trim(),
      ...(im.length ? { im } : {}),
    };

    const nextProducts = editing
      ? products.map((p) => (p.id === editing.id ? product : p))
      : [...products, product];

    setSaveLoading(true);
    try {
      await cleanupReplacedImages(im);
      await persistProducts(nextProducts);
      setModalOpen(false);
    } catch (e: unknown) {
      console.error(e);
      const msg =
        e instanceof Error
          ? e.message
          : e && typeof e === 'object' && 'response' in e
            ? (e as { response?: { data?: { error?: string } } }).response?.data?.error
            : undefined;
      alert(msg ?? 'Não foi possível salvar o produto.');
    } finally {
      setSaveLoading(false);
    }
  };

  const removeProduct = async (id: string) => {
    setDeleteLoading(true);
    try {
      const target = products.find((p) => p.id === id);
      if (target?.im?.length) {
        for (const img of target.im) await removeRemoteImage(img);
      }
      await persistProducts(products.filter((p) => p.id !== id));
      setDeleteId(null);
    } catch (e) {
      console.error(e);
      alert('Não foi possível remover o produto.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const formPriceValid = form.name.trim().length > 0 && isValidCurrencyDigits(form.price);

  return (
    <Layout>
      <div className="animate-fade-in space-y-6">
        <PageHeader
          icon={Store}
          title="Loja integrada"
          subtitle="A IA envia fotos só quando o cliente especifica categoria ou produto (máx. 5 por vez), com nome e descrição na legenda."
          actions={
            <Button variant="primary" className="h-11 w-full gap-2 sm:h-auto sm:w-auto" onClick={openCreate}>
              <Plus size={20} aria-hidden /> Adicionar produto
            </Button>
          }
        />

        {!cloudConfigured ? (
          <p className="rounded-xl border border-border bg-surface-inset px-4 py-3 text-sm text-foreground-muted">
            Cloudinary não configurado — produtos funcionam sem foto. Defina{' '}
            <code className="text-xs">CLOUDINARY_ACCOUNT_*_CLOUD_NAME</code> no servidor.
          </p>
        ) : null}

        <FilterBar onSearch={setSearchTerm} searchValue={searchTerm} searchPlaceholder="Buscar produtos..." />

        {loading ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[4/5] w-full rounded-2xl" />
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          products.length === 0 ? (
            <EmptyState
              icon={Store}
              title="Nenhum produto cadastrado"
              description="Monte a vitrine com nome, preço, descrição e até duas fotos por produto. A IA passa a usar o catálogo automaticamente."
            />
          ) : (
            <EmptyState
              icon={SearchX}
              title="Nenhum resultado"
              description="Nenhum produto corresponde ao filtro actual. Ajuste a busca."
            />
          )
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredProducts.map((product) => {
              const mainUrl = product.im?.[0] ? buildProductImageCdnUrl(product.im[0], cloudNames) : '';
              const thumbUrl = product.im?.[1]
                ? buildProductImageCdnUrl(product.im[1], cloudNames, STORE_IMAGE_TRANSFORM_THUMB)
                : '';
              return (
                <article
                  key={product.id}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-sm transition-shadow hover:shadow-md">
                  <div className="relative aspect-[4/3] overflow-hidden bg-surface-inset">
                    {mainUrl ? (
                      <img src={mainUrl} alt={product.name} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]" loading="lazy" />
                    ) : (
                      <div className="flex h-full flex-col items-center justify-center gap-2 text-foreground-muted">
                        <Package size={32} strokeWidth={1.25} aria-hidden />
                        <span className="text-xs">Sem foto</span>
                      </div>
                    )}
                    {thumbUrl ? (
                      <div className="absolute bottom-2 right-2 h-11 w-11 overflow-hidden rounded-md border-2 border-surface shadow-sm">
                        <img src={thumbUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
                      </div>
                    ) : null}
                  </div>
                  <div className="flex flex-1 flex-col gap-2 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="line-clamp-2 min-w-0 flex-1 text-base font-semibold leading-snug text-foreground">{product.name}</h3>
                      <p className="shrink-0 text-base font-bold tabular-nums text-primary">{formatStorePrice(product.price)}</p>
                    </div>
                    {product.description ? (
                      <p className="line-clamp-2 flex-1 text-sm text-foreground-muted">{product.description}</p>
                    ) : (
                      <div className="flex-1" />
                    )}
                    <div className="mt-2 flex gap-2 border-t border-border pt-3">
                      <Button variant="outline" size="sm" className="flex-1 gap-1.5" onClick={() => openEdit(product)}>
                        <Edit size={15} aria-hidden /> Editar
                      </Button>
                      <Button variant="outline" size="sm" className="gap-1.5 text-danger hover:bg-danger-muted" onClick={() => setDeleteId(product.id)}>
                        <Trash2 size={15} aria-hidden />
                      </Button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <ModalForm
          formId="store-product-form"
          submitDisabled={saveLoading || !formPriceValid || imageSlots.some((s) => s.uploading)}
          submitLoading={saveLoading}
          submitLabel={saveLoading ? 'Salvando…' : 'Salvar'}
          isOpen={modalOpen}
          onClose={() => !saveLoading && setModalOpen(false)}
          icon={Package}
          title={editing ? 'Editar produto' : 'Novo produto'}
          subtitle={editing ? 'Alterações aplicadas de imediato.' : 'Produto disponível na vitrine e para a IA.'}>
          <ModalBody>
            <form
              id="store-product-form"
              onSubmit={(e) => {
                e.preventDefault();
                void saveProduct();
              }}>
              <ModalSection>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_minmax(7rem,9rem)]">
                  <TextInput
                    label="Nome"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="Ex.: Camiseta básica"
                  />
                  <CurrencyInput
                    label="Preço"
                    value={form.price}
                    onChange={(digits) => setForm((f) => ({ ...f, price: digits }))}
                    placeholder="0,00"
                  />
                </div>
                <TextInput
                  label="Descrição"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Opcional — detalhes, tamanhos, cores…"
                />

                <div className="w-full space-y-1.5">
                  <Label>Imagens (máx. {MAX_IMAGES_PER_PRODUCT})</Label>
                  <div className="flex flex-wrap gap-3">
                    {([0, 1] as const).map((index) => {
                      const slot = imageSlots[index];
                      return (
                        <div key={index} className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg border border-dashed border-border bg-surface-inset">
                          {slot.previewUrl ? (
                            <>
                              <img src={slot.previewUrl} alt="" className="h-full w-full object-cover" />
                              {slot.uploading ? (
                                <div className="absolute inset-0 flex items-center justify-center bg-overlay-a45">
                                  <Loader2 className="animate-spin text-foreground-inverse" size={20} />
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  className="absolute right-1 top-1 rounded-full bg-overlay p-1 text-foreground-inverse hover:bg-danger"
                                  aria-label="Remover imagem"
                                  onClick={() => void clearImageSlot(index)}>
                                  <X size={12} />
                                </button>
                              )}
                            </>
                          ) : (
                            <label className="flex h-full cursor-pointer flex-col items-center justify-center gap-1 p-1 text-center text-foreground-muted hover:text-primary">
                              <ImagePlus size={20} strokeWidth={1.25} aria-hidden />
                              <span className="text-[10px] font-medium leading-tight">Foto {index + 1}</span>
                              <input
                                type="file"
                                accept="image/jpeg,image/png,image/webp,image/gif"
                                className="sr-only"
                                disabled={!cloudConfigured || slot.uploading}
                                onChange={(e) => {
                                  const file = e.target.files?.[0] ?? null;
                                  e.target.value = '';
                                  void handleImagePick(index, file);
                                }}
                              />
                            </label>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </ModalSection>
            </form>
          </ModalBody>
        </ModalForm>

        <Modal
          variant="dialog"
          maxWidth="md"
          icon={Trash2}
          isOpen={deleteId !== null}
          onClose={() => !deleteLoading && setDeleteId(null)}
          title="Remover produto"
          subtitle="Esta operação não pode ser desfeita."
          footer={
            <ModalFooterBar size="md">
              <Button variant="outline" type="button" disabled={deleteLoading} onClick={() => setDeleteId(null)}>
                Cancelar
              </Button>
              <Button
                variant="primary"
                type="button"
                className="bg-red-600 hover:bg-red-700"
                disabled={deleteLoading}
                onClick={() => deleteId && void removeProduct(deleteId)}>
                {deleteLoading ? <Loader2 size={18} className="animate-spin" /> : null}
                Remover
              </Button>
            </ModalFooterBar>
          }>
          <ModalBody>
            <p className="text-slate-600 dark:text-slate-400">Tem a certeza de que quer eliminar este produto e as fotos associadas?</p>
          </ModalBody>
        </Modal>
      </div>
    </Layout>
  );
};

export default IntegratedStore;
