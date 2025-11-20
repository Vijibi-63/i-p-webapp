export type DocType = 'invoice' | 'proposal';

export interface LineItem {
  id: string;
  description: string;
  cost: number;
}

export interface BaseDoc {
  id: string;
  type: DocType;
  number: string;
  dateISO: string;
  logoDataUrl?: string;
  billTo: string;
  forWhat: string;
  items: LineItem[]; // legacy: first table items, kept for compatibility
  total: number; // legacy: aggregated total for list views
  tables?: TableBlock[];
  endnote?: string;
  tags?: string[];
  updatedAtISO: string;
  version: 1;
}

export interface ProposalDoc extends BaseDoc {
  disclaimer: string;
}

export interface InvoiceDoc extends BaseDoc {}

export interface TableBlock {
  id: string;
  title?: string;
  items: LineItem[];
  total: number;
}
