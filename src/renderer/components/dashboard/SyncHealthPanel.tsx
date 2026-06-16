import React, { useEffect, useState } from 'react';

interface SyncHealth {
  downloaded: number;
  uploaded: number;
  synced: number;
  unsynced: number;
  pendingQueue: number;
  failedQueue: number;
  lastSyncAt: number | null;
}

export function SyncHealthPanel() {
  const [data, setData] = useState<SyncHealth | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.electronAPI.analyticsSyncHealth().then((d) => {
      setData(d);
      setLoading(false);
    });
  }, []);

  if (loading || !data) return <div className="h-48 flex items-center justify-center text-gray-400">Loading...</div>;

  const cards = [
    { label: 'Downloaded', value: data.downloaded, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Uploaded', value: data.uploaded, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Synced', value: data.synced, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Unsynced', value: data.unsynced, color: 'text-gray-600', bg: 'bg-gray-50' },
    { label: 'Pending Queue', value: data.pendingQueue, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Failed', value: data.failedQueue, color: 'text-red-600', bg: 'bg-red-50' },
  ];

  return (
    <div>
      <div className="grid grid-cols-3 gap-3">
        {cards.map((card) => (
          <div key={card.label} className={`${card.bg} rounded-lg p-3 text-center`}>
            <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
            <p className="text-xs text-gray-500 mt-1">{card.label}</p>
          </div>
        ))}
      </div>
      {data.lastSyncAt && (
        <p className="text-xs text-gray-400 mt-3 text-center">
          Last sync: {new Date(data.lastSyncAt).toLocaleString()}
        </p>
      )}
    </div>
  );
}
