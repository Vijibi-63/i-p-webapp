import React, { useEffect, useState, useRef } from 'react';
import logo from '../assets/logo.png';
import { useNavigate, useParams } from 'react-router-dom';
import { StorageService } from '../storage';
import type { DocType, BaseDoc, ProposalDoc, TableBlock } from '../types';

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
  const [editingCostKey, setEditingCostKey] = useState<string | null>(null);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load doc on mount
  useEffect(() => {
    async function load() {
      if (id) {
        const loaded = await StorageService.get(id);
        if (loaded) setDoc(ensureTables(loaded as BaseDoc | ProposalDoc));
      } else if (type === 'invoice' || type === 'proposal') {
        const initialDoc = await getInitialDoc(type as DocType);
        setDoc(ensureTables(initialDoc));
      }
    }
    load();
  }, [id, type]);

  const ensureTables = (incoming: BaseDoc | ProposalDoc) => {
    const tables: TableBlock[] =
      incoming.tables && incoming.tables.length
        ? incoming.tables.map(t => ({
          ...t,
          id: t.id || crypto.randomUUID(),
          items: t.items?.length ? t.items : [{ id: crypto.randomUUID(), description: '', cost: 0 }],
          total: t.total ?? 0,
        }))
        : [
          {
            id: crypto.randomUUID(),
            title: '',
            items: incoming.items?.length ? incoming.items : [{ id: crypto.randomUUID(), description: '', cost: 0 }],
            total: incoming.total ?? 0,
          },
        ];
    return { ...incoming, tables };
  };

  // Auto-calc total per table + doc aggregate
  useEffect(() => {
    if (!doc || !doc.tables) return;
    let changed = false;
    const tables = doc.tables.map((t) => {
      const tableTotal = t.items.reduce((sum, item) => sum + (item.description ? item.cost : 0), 0);
      if (tableTotal !== t.total) changed = true;
      return tableTotal === t.total ? t : { ...t, total: tableTotal };
    });
    const aggregateTotal = tables.reduce((sum, t) => sum + t.total, 0);
    if (changed || aggregateTotal !== doc.total || doc.items !== tables[0]?.items) {
      setDoc(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          tables,
          items: tables[0]?.items ?? prev.items,
          total: aggregateTotal,
        };
      });
    }
  }, [doc?.tables]);

  // Auto-save debounce
  useEffect(() => {
    if (!doc) return;
    const currentDoc = doc;
    setSaving('saving');
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(async () => {
  await StorageService.save({ ...currentDoc, updatedAtISO: new Date().toISOString() });
      setSaving('saved');
      setTimeout(() => setSaving('idle'), 1200);
    }, 700);
    // eslint-disable-next-line
  }, [doc]);

  const handleChange = (field: string, value: any) => {
    setDoc(prev => (prev ? { ...prev, [field]: value } : prev));
  };
  const formatMoney = (value: number) =>
    value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const autoResize = (el: HTMLTextAreaElement | null) => {
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  };
  const handleItemChange = (tableIdx: number, idx: number, field: string, value: any) => {
    setDoc(prev => {
      if (!prev || !prev.tables) return prev;
      const tables = prev.tables.map((table, tIndex) => {
        if (tIndex !== tableIdx) return table;
        const items = table.items.map((item, i) => i === idx ? { ...item, [field]: value } : item);
        return { ...table, items };
      });
      return { ...prev, tables };
    });
  };
  const handleDescriptionChangeTable = (tableIdx: number, idx: number) => (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    autoResize(e.target);
    handleItemChange(tableIdx, idx, 'description', e.target.value);
  };
  const handleAddItemToTable = (tableIdx: number) => {
    setDoc(prev => {
      if (!prev || !prev.tables) return prev;
      const tables = prev.tables.map((table, tIndex) => {
        if (tIndex !== tableIdx) return table;
        return {
          ...table,
          items: [...table.items, { id: crypto.randomUUID(), description: '', cost: 0 }],
        };
      });
      return { ...prev, tables };
    });
  };
  const handleRemoveItemFromTable = (tableIdx: number, idx: number) => {
    setDoc(prev => {
      if (!prev || !prev.tables) return prev;
      const tables = prev.tables.map((table, tIndex) => {
        if (tIndex !== tableIdx) return table;
        return { ...table, items: table.items.filter((_, i) => i !== idx) };
      });
      return { ...prev, tables };
    });
  };
  const handleSave = async () => {
    if (!doc) return;
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

  useEffect(() => {
    if (isPrint) return;
    const timer = requestAnimationFrame(() => {
      document
        .querySelectorAll<HTMLTextAreaElement>('.description-textarea')
        .forEach(autoResize);
    });
    return () => cancelAnimationFrame(timer);
  }, [doc?.tables, isPrint]);

  const handleCostChange = (tableIdx: number, idx: number) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/,/g, '').trim();
    const num = raw === '' ? 0 : Number(raw);
    if (Number.isNaN(num)) return; // ignore invalid
    handleItemChange(tableIdx, idx, 'cost', Number.isFinite(num) ? num : 0);
  };
  const costDisplay = (tableIdx: number, item: { cost: number }, idx: number) => {
    const isEditing = editingCostKey === `${tableIdx}-${idx}`;
    if (isEditing) return item.cost === 0 ? '' : String(item.cost);
    return item.cost === 0 ? '' : formatMoney(item.cost);
  };

  const addTable = () => {
    setDoc(prev => {
      if (!prev || !prev.tables) return prev;
      const newTable: TableBlock = {
        id: crypto.randomUUID(),
        title: '',
        items: [{ id: crypto.randomUUID(), description: '', cost: 0 }],
        total: 0,
      };
      return { ...prev, tables: [...prev.tables, newTable] };
    });
  };

  const removeTable = (tableIdx: number) => {
    setDoc(prev => {
      if (!prev || !prev.tables || prev.tables.length <= 1) return prev;
      const tables = prev.tables.filter((_, idx) => idx !== tableIdx);
      return { ...prev, tables };
    });
  };

  const moveTable = (tableIdx: number, direction: -1 | 1) => {
    setDoc(prev => {
      if (!prev || !prev.tables) return prev;
      const target = tableIdx + direction;
      if (target < 0 || target >= prev.tables.length) return prev;
      const tables = [...prev.tables];
      [tables[tableIdx], tables[target]] = [tables[target], tables[tableIdx]];
      return { ...prev, tables };
    });
  };

  const handleTableTitleChange = (tableIdx: number) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value.slice(0, 30);
    setDoc(prev => {
      if (!prev || !prev.tables) return prev;
      const tables = prev.tables.map((t, idx) => (idx === tableIdx ? { ...t, title: next } : t));
      return { ...prev, tables };
    });
  };

  const displayTitle = (table: TableBlock, idx: number) => (table.title?.trim() ? table.title.trim() : `Option ${idx + 1}`);

  if (!doc) return <div>Loading...</div>;
  const tables = doc.tables ?? [];

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
            {isPrint ? (
              <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', minHeight: 48 }}>
                {doc.billTo}
              </div>
            ) : (
              <textarea value={doc.billTo} onChange={e => handleChange('billTo', e.target.value)} rows={3} />
            )}
          </div>
          <div style={{ flex: 1 }} className="billfor-box">
            <span className="billfor-label">For</span>
            {isPrint ? (
              <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', minHeight: 48 }}>
                {doc.forWhat}
              </div>
            ) : (
              <textarea value={doc.forWhat} onChange={e => handleChange('forWhat', e.target.value)} rows={3} />
            )}
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
        {tables.map((table, tIdx) => (
          <div key={table.id} style={{ marginTop: tIdx === 0 ? 12 : 24, paddingTop: tIdx === 0 ? 0 : 12, borderTop: tIdx === 0 ? 'none' : '1px dashed #c7c7c7' }}>
            {tables.length > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8, gap: 8 }}>
                {isPrint ? (
                  <strong>{displayTitle(table, tIdx)}</strong>
                ) : (
                  <input
                    type="text"
                    value={displayTitle(table, tIdx)}
                    onChange={handleTableTitleChange(tIdx)}
                    maxLength={30}
                    style={{
                      width: `${Math.min(30, Math.max(8, displayTitle(table, tIdx).length + 1))}ch`,
                      fontWeight: 700,
                      border: '1px solid #b3b3b3',
                      padding: '6px 10px',
                    }}
                    aria-label={`Table title ${tIdx + 1}`}
                  />
                )}
                {!isPrint && (
                  <>
                    <button onClick={() => moveTable(tIdx, -1)} disabled={tIdx === 0}>Up</button>
                    <button onClick={() => moveTable(tIdx, 1)} disabled={tIdx === tables.length - 1}>Down</button>
                    <button onClick={() => removeTable(tIdx)} disabled={tables.length === 1}>Delete table</button>
                  </>
                )}
              </div>
            )}
            <table className="doc-table" style={{ width: '100%', margin: '12px 0', borderCollapse: 'collapse', border: '1px solid #b3b3b3' }}>
              <thead>
                <tr style={{ background: '#f7f7f7' }}>
                  <th style={{ border: '1px solid #b3b3b3', padding: '8px', textAlign: 'left' }}>Description</th>
                  <th style={{ border: '1px solid #b3b3b3', padding: '8px', textAlign: 'right' }}>Cost</th>
                  {!isPrint && <th style={{ border: '1px solid #b3b3b3', padding: '8px', width: 32 }}></th>}
                </tr>
              </thead>
              <tbody>
                {table.items.map((item, idx) => (
                  <tr key={item.id}>
                    <td style={{ border: '1px solid #b3b3b3', padding: '8px', textAlign: 'left' }}>
                      {isPrint ? (
                        <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', minHeight: 32, textAlign: 'left' }}>{item.description}</div>
                      ) : (
                        <textarea
                          className="description-textarea"
                          value={item.description}
                          onChange={handleDescriptionChangeTable(tIdx, idx)}
                          onInput={e => autoResize(e.currentTarget)}
                          style={{ width: '100%', background: '#fff', color: '#222', resize: 'none', minHeight: 32, overflowWrap: 'break-word', textAlign: 'left', overflow: 'hidden' }}
                          rows={2}
                        />
                      )}
                    </td>
                    <td style={{ border: '1px solid #b3b3b3', padding: '8px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <span style={{ marginRight: 4 }}>$</span>
                      {isPrint ? (
                        <span>{formatMoney(Number(item.cost))}</span>
                      ) : (
                        <input
                          type="text"
                          inputMode="decimal"
                          value={costDisplay(tIdx, item, idx)}
                          onFocus={() => setEditingCostKey(`${tIdx}-${idx}`)}
                          onBlur={() => setEditingCostKey(null)}
                          onChange={handleCostChange(tIdx, idx)}
                          style={{ width: 110, background: '#fff', color: '#222', textAlign: 'right' }}
                        />
                      )}
                    </td>
                    {!isPrint && (
                      <td style={{ border: '1px solid #b3b3b3', padding: '8px', textAlign: 'center', width: 32 }}>
                        <button onClick={() => handleRemoveItemFromTable(tIdx, idx)} disabled={table.items.length === 1} style={{ color: 'red', fontWeight: 'bold', fontSize: 18, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }} title="Remove">-</button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              {!isPrint && (
                <button className="add-line-btn no-print" onClick={() => handleAddItemToTable(tIdx)}>Add Line Item</button>
              )}
              <div style={{ textAlign: 'right', fontSize: 16, fontWeight: 600 }}>
                Table Total: ${formatMoney(table.total)}
              </div>
            </div>
          </div>
        ))}
        {!isPrint && (
          <button className="add-line-btn no-print" onClick={addTable} style={{ marginTop: 16 }}>
            Add New Table
          </button>
        )}
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
          @page { size: A4 portrait; margin: 16mm 12mm 16mm 12mm; }
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
          .doc-table { margin: 4mm 0 !important; break-inside: auto !important; page-break-inside: auto !important; }
          .doc-table tr { break-inside: avoid !important; page-break-inside: avoid !important; }
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
