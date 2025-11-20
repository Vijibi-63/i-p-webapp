import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { StorageService } from '../storage';
import type { DocType, BaseDoc } from '../types';

const TABS: Array<{ label: string; value?: DocType | 'all' }> = [
  { label: 'Invoice', value: 'invoice' },
  { label: 'Proposal', value: 'proposal' },
  { label: 'All', value: 'all' },
];

const LibraryPage: React.FC = () => {
  const [tab, setTab] = useState<'invoice' | 'proposal' | 'all'>('all');
  const [search, setSearch] = useState('');
  const [docs, setDocs] = useState<BaseDoc[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const sortByNumberDesc = (a: BaseDoc, b: BaseDoc) => {
    const extractNum = (n: string) => {
      const match = n.match(/(\d+)(?!.*\d)/);
      return match ? parseInt(match[1], 10) : Number.NEGATIVE_INFINITY;
    };
    const numA = extractNum(a.number);
    const numB = extractNum(b.number);
    if (numA !== numB) return numB - numA;
    return b.number.localeCompare(a.number);
  };

  const formatMoney = (value: number) =>
    value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const refresh = async () => {
    setLoading(true);
    let list = await StorageService.list(tab === 'all' ? undefined : tab);
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(doc =>
        doc.number.toLowerCase().includes(s) ||
        doc.billTo.toLowerCase().includes(s) ||
        doc.forWhat.toLowerCase().includes(s) ||
        (doc.tags?.some(t => t.toLowerCase().includes(s)))
      );
    }
    list = [...list].sort(sortByNumberDesc);
    setDocs(list);
    setLoading(false);
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line
  }, [tab, search]);

  const handleOpen = (doc: BaseDoc) => {
    navigate(`/edit/${doc.type}/${doc.id}`);
  };
  // duplicate action removed from UI
  const handleDelete = async (doc: BaseDoc) => {
    try {
      await StorageService.remove(doc.id);
      await refresh();
    } catch (e) {
      console.error(e);
      alert('Failed to delete document.');
    }
  };

  return (
  <div className="library-container" style={{ width: '100vw', minHeight: '100vh', margin: 0, background: '#fff', padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
        <button onClick={() => navigate('/')} title="Back to Landing" style={{ fontSize: 20, padding: '4px 12px', marginRight: 12 }}>
          ←
        </button>
        <h2 style={{ margin: 0 }}>Library</h2>
      </div>
      <div className="tabs">
        {TABS.map(t => (
          <button
            key={t.value}
            className={tab === t.value ? 'active' : ''}
            onClick={() => setTab(t.value as any)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <input
        type="text"
        placeholder="Search by number, Bill To, For, tags..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{ margin: '12px 0', width: '100%' }}
      />
      {loading ? <div>Loading...</div> : (
        <table className="doc-list" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Number</th>
              <th>Total</th>
              <th>Last Updated</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {docs.map(doc => {
              const firstBillToLine = (doc.billTo || '').split('\n')[0] || '';
              const name = `${doc.number}${firstBillToLine ? ' - ' + firstBillToLine : ''}`;
              return (
                <tr key={doc.id}>
                  <td>{name}</td>
                  <td>{doc.type}</td>
                  <td>{doc.number}</td>
                  <td>{formatMoney(doc.total)}</td>
                  <td>{doc.updatedAtISO.slice(0, 16).replace('T', ' ')}</td>
                  <td>
                    <button onClick={() => handleOpen(doc)}>Open</button>
                    <button onClick={() => handleDelete(doc)}>Delete</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default LibraryPage;
