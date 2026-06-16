import React, { useEffect, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

export function AiUsageChart() {
  const [data, setData] = useState<Array<{ model: string; contracts: number; totalTokens: number }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.electronAPI.analyticsAiUsage().then((d) => {
      setData(d);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="h-48 flex items-center justify-center text-gray-400">Loading...</div>;
  if (data.length === 0) return <div className="h-48 flex items-center justify-center text-gray-400">No AI usage yet</div>;

  const chartData = {
    labels: data.map((d) => d.model),
    datasets: [
      {
        label: 'Contracts Generated',
        data: data.map((d) => d.contracts),
        backgroundColor: '#3b82f6',
      },
      {
        label: 'Tokens Used (×1000)',
        data: data.map((d) => Math.round(d.totalTokens / 1000)),
        backgroundColor: '#8b5cf6',
      },
    ],
  };

  return (
    <Bar
      data={chartData}
      options={{
        responsive: true,
        plugins: { legend: { position: 'bottom', labels: { font: { size: 11 } } } },
        scales: { y: { beginAtZero: true } },
      }}
    />
  );
}
