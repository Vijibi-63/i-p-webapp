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
  items: LineItem[];
  total: number;
  endnote?: string;
  tags?: string[];
  updatedAtISO: string;
  version: 1;
}

export interface ProposalDoc extends BaseDoc {
  disclaimer: string;
}

export interface InvoiceDoc extends BaseDoc {}
