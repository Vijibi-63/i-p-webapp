import type { DocType, BaseDoc } from '../types';

export interface StorageService {
  list(type?: DocType, tag?: string): Promise<BaseDoc[]>;
  get(id: string): Promise<BaseDoc | null>;
  save(doc: BaseDoc): Promise<void>;
  remove(id: string): Promise<void>;
  duplicate(id: string): Promise<BaseDoc>;
}

// Implementation will use localforage for IndexedDB storage.
