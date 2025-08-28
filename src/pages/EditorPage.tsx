import React, { useEffect, useState, useRef } from 'react';
import logo from '../assets/logo.png';
import { useNavigate, useParams } from 'react-router-dom';
import { StorageService } from '../storage';
import type { DocType, BaseDoc, ProposalDoc } from '../types';

const DEFAULT_ENDNOTE = {
  invoice: 'Make all checks payable to Overlook Mechanical Services. \nTotal due in 15 days. Overdue accounts subject to a service charge of 1% per month. \n Thank you for your business!',
  proposal: 'Overlook Mechanical Services\nBethland Bosse\nTHANK YOU FOR YOUR BUSINESS!',
};

const DEFAULT_DISCLAIMER = {
  proposal:
    'Overlook Mechanical Services:\nProposes the following scope of work to be done, and to include the cost of permits and inspections.\nThis quote does not include any fixtures.',
};

async function getInitialDoc(type: DocType): Promise<BaseDoc | ProposalDoc> {
  const now = new Date();
  const dateISO = now.toISOString();
  const number = await StorageService.getNextNumber(type);
  const base: BaseDoc = {
    id: crypto.randomUUID(),
    type,
    number,
    dateISO,
    billTo: '',
    forWhat: '',
    items: [{ id: crypto.randomUUID(), description: '', cost: 0 }],
    total: 0,
    endnote: DEFAULT_ENDNOTE[type],
    updatedAtISO: dateISO,
    version: 1,
  };
  if (type === 'proposal') {
    return { ...base, disclaimer: DEFAULT_DISCLAIMER.proposal };
  }
  return base;
}

const EditorPage: React.FC = () => {
  const navigate = useNavigate();
  const { type, id } = useParams();
  const [doc, setDoc] = useState<BaseDoc | ProposalDoc | null>(null);
  const [isPrint, setIsPrint] = useState(false);
  const [saving, setSaving] = useState<'idle' | 'saving' | 'saved'>('idle');
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load doc on mount
  useEffect(() => {
    async function load() {
      if (id) {
        const loaded = await StorageService.get(id);
        if (loaded) setDoc(loaded);
      } else if (type === 'invoice' || type === 'proposal') {
        const initialDoc = await getInitialDoc(type as DocType);
        setDoc(initialDoc);
      }
    }
    load();
  }, [id, type]);

  // Auto-calc total
  useEffect(() => {
    if (!doc) return;
    const total = doc.items.reduce((sum, item) => sum + (item.description ? item.cost : 0), 0);
    if (doc.total !== total) setDoc({ ...doc, total });
  }, [doc?.items]);

  // Auto-save debounce
  useEffect(() => {
    if (!doc) return;
    setSaving('saving');
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(async () => {
  await StorageService.save({ ...doc, updatedAtISO: new Date().toISOString() });
      setSaving('saved');
      setTimeout(() => setSaving('idle'), 1200);
    }, 700);
    // eslint-disable-next-line
  }, [doc]);

  if (!doc) return <div>Loading...</div>;

  const handleChange = (field: string, value: any) => {
    setDoc({ ...doc, [field]: value });
  };
  const handleItemChange = (idx: number, field: string, value: any) => {
    const items = doc.items.map((item, i) => i === idx ? { ...item, [field]: value } : item);
    setDoc({ ...doc, items });
  };
  const handleAddItem = () => {
    setDoc({ ...doc, items: [...doc.items, { id: crypto.randomUUID(), description: '', cost: 0 }] });
  };
  const handleRemoveItem = (idx: number) => {
    setDoc({ ...doc, items: doc.items.filter((_, i) => i !== idx) });
  };
  const handleSave = async () => {
    setSaving('saving');
  await StorageService.save({ ...doc, updatedAtISO: new Date().toISOString() });
    setSaving('saved');
    setTimeout(() => setSaving('idle'), 1200);
  };
  // duplicate action removed; keep codebase clean
  const handlePrint = () => {
    setIsPrint(true);
    setTimeout(() => {
      window.print();
      setIsPrint(false);
    }, 100);
  };

  return (
    <div className="editor-container">
      <div className="toolbar no-print" style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
        <button onClick={() => navigate('/')}>Back to Landing</button>
        <button onClick={() => navigate('/library')}>Back to Library</button>
  <button onClick={handleSave}>Save</button>
  <button onClick={handlePrint}>Print / Download PDF</button>
        <span style={{ marginLeft: 'auto', fontWeight: 500 }}>
          {saving === 'saving' ? 'Saving...' : saving === 'saved' ? 'Saved' : ''}
        </span>
      </div>
  <div className="doc-canvas" style={{ width: 800, maxWidth: '100%', margin: '0 auto', background: '#fff', padding: 24, boxShadow: '0 0 8px #ccc', textAlign: 'left' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <img src={logo} alt="Logo" style={{ width: 280, height: 180, borderRadius: 8, marginBottom: 8 }} />
          </div>
          <div style={{ fontSize: 32, fontWeight: 700 }}>{doc.type === 'invoice' ? 'INVOICE' : 'PROPOSAL'}</div>
        </div>
        <div className="number-date-row">
          <label>Number <input value={doc.number} onChange={e => handleChange('number', e.target.value)} required /></label>
          <label>Date <input type="date" value={doc.dateISO.slice(0,10)} onChange={e => handleChange('dateISO', e.target.value + doc.dateISO.slice(10))} required /></label>
        </div>
        <div style={{ display: 'flex', gap: 16 }}>
          <div style={{ flex: 1 }} className="billfor-box">
            <span className="billfor-label">Bill To</span>
            <textarea value={doc.billTo} onChange={e => handleChange('billTo', e.target.value)} rows={3} />
          </div>
          <div style={{ flex: 1 }} className="billfor-box">
            <span className="billfor-label">For</span>
            <textarea value={doc.forWhat} onChange={e => handleChange('forWhat', e.target.value)} rows={3} />
          </div>
        </div>
        {doc.type === 'proposal' && (
          <div style={{ margin: '16px 0' }}>
            <label>
              Disclaimer
              <br />
              {isPrint ? (
                <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {(doc as ProposalDoc).disclaimer}
                </div>
              ) : (
                <textarea
                  value={(doc as ProposalDoc).disclaimer}
                  onChange={e => handleChange('disclaimer', e.target.value)}
                  rows={4}
                />
              )}
            </label>
          </div>
        )}
        <table className="doc-table" style={{ width: '100%', margin: '16px 0', borderCollapse: 'collapse', border: '1px solid #b3b3b3' }}>
          <thead>
            <tr style={{ background: '#f7f7f7' }}>
              <th style={{ border: '1px solid #b3b3b3', padding: '8px', textAlign: 'left' }}>Description</th>
              <th style={{ border: '1px solid #b3b3b3', padding: '8px', textAlign: 'right' }}>Cost</th>
              {!isPrint && <th style={{ border: '1px solid #b3b3b3', padding: '8px', width: 32 }}></th>}
            </tr>
          </thead>
          <tbody>
            {doc.items.map((item, idx) => (
              <tr key={item.id}>
                <td style={{ border: '1px solid #b3b3b3', padding: '8px', textAlign: 'left' }}>
                  {isPrint ? (
                    <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', minHeight: 32, textAlign: 'left' }}>{item.description}</div>
                  ) : (
                    <textarea value={item.description} onChange={e => handleItemChange(idx, 'description', e.target.value)} style={{ width: '100%', background: '#fff', color: '#222', resize: 'vertical', minHeight: 32, maxHeight: 120, overflowWrap: 'break-word', textAlign: 'left' }} rows={2} />
                  )}
                </td>
                <td style={{ border: '1px solid #b3b3b3', padding: '8px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <span style={{ marginRight: 4 }}>$</span>
                  {isPrint ? (
                    <span>{Number(item.cost).toFixed(2)}</span>
                  ) : (
                    <input type="number" step="0.01" value={item.cost === 0 ? '' : item.cost} onChange={e => handleItemChange(idx, 'cost', e.target.value === '' ? 0 : parseFloat(e.target.value))} style={{ width: 80, background: '#fff', color: '#222', textAlign: 'right' }} />
                  )}
                </td>
                {!isPrint && (
                  <td style={{ border: '1px solid #b3b3b3', padding: '8px', textAlign: 'center', width: 32 }}>
                    <button onClick={() => handleRemoveItem(idx)} disabled={doc.items.length === 1} style={{ color: 'red', fontWeight: 'bold', fontSize: 18, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }} title="Remove">×</button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {!isPrint && (
          <button className="add-line-btn no-print" onClick={handleAddItem}>Add Line Item</button>
        )}
        <div style={{ textAlign: 'right', fontSize: 20, fontWeight: 600, margin: '16px 0' }}>
          Total: ${doc.total.toFixed(2)}
        </div>
        <div style={{ margin: '16px 0' }}>
          <label>
            <br />
            {isPrint ? (
              <div style={{ textAlign: 'center', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {doc.endnote || ''}
              </div>
            ) : (
              <textarea
                value={doc.endnote || ''}
                onChange={e => handleChange('endnote', e.target.value)}
                rows={3}
                style={{ textAlign: 'center' }}
              />
            )}
          </label>
        </div>
      </div>
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .doc-canvas, .doc-canvas * { visibility: visible !important; }
          .no-print, .add-line-btn, button { display: none !important; }
          /* Fit to A4 with safe margins */
          @page { size: A4 portrait; margin: 12mm; }
          .doc-canvas {
            box-shadow: none !important;
            position: static !important;
            width: 190mm !important; /* 210mm - margins */
            margin: 0 auto !important;
            padding: 0 !important;
            background: #fff !important;
            overflow: visible !important;
          }
          .doc-table th, .doc-table td { border: 1px solid #b3b3b3 !important; padding: 8px !important; }
          .doc-table td { white-space: pre-wrap !important; word-break: break-word !important; }
          input, textarea { border: none !important; box-shadow: none !important; background: transparent !important; color: #222 !important; }
          .doc-table { table-layout: fixed !important; width: 100% !important; }
          .doc-table th:nth-child(1), .doc-table td:nth-child(1) { width: 80% !important; }
          .doc-table th:nth-child(2), .doc-table td:nth-child(2) { width: 20% !important; }
          /* Avoid browser appending link URLs */
          a[href]:after { content: '' !important; }
        }
        .billfor-label { display: block; font-weight: 500; margin-bottom: 2px; text-align: left; }
        .billfor-box { margin-bottom: 0; }
        .number-date-row { display: flex; gap: 24px; align-items: center; margin-bottom: 8px; }
        .number-date-row label { display: flex; align-items: center; gap: 8px; font-weight: 500; }
        @page { size: auto; margin: 0; }
      `}</style>
    </div>
  );
};

export default EditorPage;
