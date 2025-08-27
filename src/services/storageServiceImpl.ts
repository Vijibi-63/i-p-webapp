import localforage from 'localforage';
import type { DocType, BaseDoc } from '../types';

const DB_PREFIX = 'ipg-docs';

function getStore(type: DocType) {
  return localforage.createInstance({
    name: `${DB_PREFIX}-${type}`,
  });
}

export const storageService = {
  async list(type?: DocType, tag?: string): Promise<BaseDoc[]> {
    // Use docs_index for listing, never load full docs for Library list
    const indexStore = localforage.createInstance({ name: `${DB_PREFIX}-index` });
    let index = (await indexStore.getItem<BaseDoc[]>("doc-index")) || [];
    if (type) index = index.filter(d => d.type === type);
    if (tag) index = index.filter(d => d.tags?.includes(tag));
    // Paginate in memory if >20 items
    if (index.length > 20) index = index.slice(0, 20);
    return index.sort((a, b) => b.updatedAtISO.localeCompare(a.updatedAtISO));
  },
  async get(id: string): Promise<BaseDoc | null> {
    for (const t of ['invoice', 'proposal'] as DocType[]) {
      const store = getStore(t);
      const doc = await store.getItem<BaseDoc>(id);
      if (doc) return doc;
    }
    return null;
  },
  async save(doc: BaseDoc): Promise<void> {
    const store = getStore(doc.type);
    await store.setItem(doc.id, doc);
  },
  async remove(id: string): Promise<void> {
    for (const t of ['invoice', 'proposal'] as DocType[]) {
      const store = getStore(t);
      await store.removeItem(id);
    }
  },
  async duplicate(id: string): Promise<BaseDoc> {
    const doc = await this.get(id);
    if (!doc) throw new Error('Document not found');
    const newDoc = { ...doc, id: crypto.randomUUID(), number: doc.number + '-COPY', updatedAtISO: new Date().toISOString() };
    await this.save(newDoc);
    return newDoc;
  },
};
