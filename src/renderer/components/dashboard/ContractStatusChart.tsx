import React, { useEffect, useState } from 'react';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

const COLORS: Record<string, string> = {
  draft: '#6b7280',
  under_review: '#f59e0b',
  approved: '#3b82f6',
  signed: '#6366f1',
  active: '#10b981',
  expired: '#f97316',
  terminated: '#ef4444',
};

const LABELS: Record<string, string> = {
  draft: 'Draft',
  under_review: 'Under Review',
  approved: 'Approved',
  signed: 'Signed',
  active: 'Active',
  expired: 'Expired',
  terminated: 'Terminated',
};

export function ContractStatusChart() {
  const [data, setData] = useState<Array<{ status: string; count: number }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.electronAPI.analyticsContractStatus().then((d) => {
      setData(d);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="h-48 flex items-center justify-center text-gray-400">Loading...</div>;
  if (data.length === 0) return <div className="h-48 flex items-center justify-center text-gray-400">No contracts yet</div>;

  const chartData = {
    labels: data.map((d) => LABELS[d.status] || d.status),
    datasets: [{
      data: data.map((d) => d.count),
      backgroundColor: data.map((d) => COLORS[d.status] || '#999'),
      borderWidth: 2,
      borderColor: '#fff',
    }],
  };

  const total = data.reduce((sum, d) => sum + d.count, 0);

  return (
    <div>
      <div className="relative">
        <Doughnut data={chartData} options={{ plugins: { legend: { position: 'bottom', labels: { font: { size: 11 } } } }, maintainAspectRatio: true }} />
      </div>
      <p className="text-center text-sm text-gray-500 mt-2">{total} total contracts</p>
    </div>
  );
}
