import localforage from 'localforage';
import type { DocType, BaseDoc } from '../types';

const DB_PREFIX = 'ipg-docs';
const INDEX_KEY = 'doc-index';

function getStore(type: DocType) {
  return localforage.createInstance({ name: `${DB_PREFIX}-${type}` });
}
function getIndexStore() {
  return localforage.createInstance({ name: `${DB_PREFIX}-index` });
}

export const StorageService = {
  async save(doc: BaseDoc): Promise<void> {
    const store = getStore(doc.type);
    const indexStore = getIndexStore();
    const now = new Date().toISOString();
    let index = (await indexStore.getItem<BaseDoc[]>(INDEX_KEY)) || [];
    // Find and remove any existing docs with the same type+number but different id
    const duplicates = index.filter(d => d.type === doc.type && d.number === doc.number && d.id !== doc.id);
    if (duplicates.length) {
      for (const dup of duplicates) {
        // Remove the old doc from its store to ensure only one file per number
        const dupStore = getStore(dup.type);
        await dupStore.removeItem(dup.id);
      }
      // Remove duplicates from index
      index = index.filter(d => !(d.type === doc.type && d.number === doc.number && d.id !== doc.id));
    }
    await store.setItem(doc.id, { ...doc, updatedAtISO: now });
    index = index.filter(d => d.id !== doc.id);
    index.push({ ...doc, updatedAtISO: now });
    await indexStore.setItem(INDEX_KEY, index);
  },
  async get(id: string): Promise<BaseDoc | null> {
    for (const t of ['invoice', 'proposal'] as DocType[]) {
      const store = getStore(t);
      const doc = await store.getItem<BaseDoc>(id);
      if (doc) return doc;
    }
    return null;
  },
  async list(type?: DocType, query?: string): Promise<BaseDoc[]> {
    const indexStore = getIndexStore();
    let index = (await indexStore.getItem<BaseDoc[]>(INDEX_KEY)) || [];
    if (type) index = index.filter(d => d.type === type);
    // Remove duplicates by number, keep latest
    const unique: Record<string, BaseDoc> = {};
    for (const doc of index) {
      unique[doc.type + doc.number] = doc;
    }
    index = Object.values(unique);
    if (query) {
      const s = query.toLowerCase();
      index = index.filter(doc =>
        doc.number.toLowerCase().includes(s) ||
        doc.billTo.toLowerCase().includes(s) ||
        doc.forWhat.toLowerCase().includes(s) ||
        (doc.tags?.some(t => t.toLowerCase().includes(s)))
      );
    }
    return index.sort((a, b) => b.updatedAtISO.localeCompare(a.updatedAtISO));
  },
  async remove(id: string): Promise<void> {
    for (const t of ['invoice', 'proposal'] as DocType[]) {
      const store = getStore(t);
      await store.removeItem(id);
    }
    const indexStore = getIndexStore();
    let index = (await indexStore.getItem<BaseDoc[]>(INDEX_KEY)) || [];
    index = index.filter(d => d.id !== id);
    await indexStore.setItem(INDEX_KEY, index);
  },
  async duplicate(id: string): Promise<BaseDoc> {
    const doc = await this.get(id);
    if (!doc) throw new Error('Document not found');
    const now = new Date().toISOString();
    const newId = crypto.randomUUID();
    const nextNumber = await this.getNextNumber(doc.type);
    const newDoc = { ...doc, id: newId, number: nextNumber, updatedAtISO: now };
    await this.save(newDoc);
    return newDoc;
  },

  async getNextNumber(type: DocType): Promise<string> {
    const indexStore = getIndexStore();
    let index = (await indexStore.getItem<BaseDoc[]>(INDEX_KEY)) || [];
    index = index.filter(d => d.type === type);
    // Find max number for current year across both index and underlying store
    const year = new Date().getFullYear() % 100;
    const prefix = type === 'invoice' ? `I${year}` : `P${year}`;
    let maxNum = 0;
    const collect = (numStr?: string) => {
      if (!numStr) return;
      const match = numStr.match(new RegExp(`^${prefix}(\\d+)$`));
      if (match) {
        const num = parseInt(match[1], 10);
        if (!Number.isNaN(num) && num > maxNum) maxNum = num;
      }
    };
    for (const doc of index) collect(doc.number);
    // Also scan the underlying store for this type to be robust
    const store = getStore(type);
    try {
      await store.iterate<BaseDoc, void>((value) => {
        collect(value?.number);
      });
    } catch {}
    const nextNum = String(maxNum + 1).padStart(3, '0');
    return `${prefix}${nextNum}`;
  },
};
