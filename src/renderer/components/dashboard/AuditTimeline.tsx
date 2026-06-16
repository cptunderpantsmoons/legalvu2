import React, { useEffect, useState, useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js';
import { format, subDays, parseISO } from 'date-fns';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

interface TimelineEntry {
  date: string;
  action: string;
  count: number;
}

export function AuditTimeline() {
  const [data, setData] = useState<TimelineEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.electronAPI.analyticsAuditTimeline().then((d) => {
      setData(d);
      setLoading(false);
    });
  }, []);

  const chartData = useMemo(() => {
    const last30 = Array.from({ length: 30 }, (_, i) => format(subDays(new Date(), 29 - i), 'yyyy-MM-dd'));

    const actions = [...new Set(data.map((d) => d.action))];
    const colorPalette = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#ec4899', '#84cc16'];
    const colors: Record<string, string> = {};
    actions.forEach((a, i) => { colors[a] = colorPalette[i % colorPalette.length]; });

    const countMap: Record<string, Record<string, number>> = {};
    for (const entry of data) {
      if (!countMap[entry.date]) countMap[entry.date] = {};
      countMap[entry.date][entry.action] = entry.count;
    }

    const datasets = actions.map((action) => ({
      label: action,
      data: last30.map((date) => countMap[date]?.[action] || 0),
      backgroundColor: colors[action],
    }));

    return {
      labels: last30.map((d) => format(parseISO(d), 'MMM d')),
      datasets,
    };
  }, [data]);

  if (loading) return <div className="h-48 flex items-center justify-center text-gray-400">Loading...</div>;
  if (data.length === 0) return <div className="h-48 flex items-center justify-center text-gray-400">No audit activity yet</div>;

  return (
    <Bar
      data={chartData}
      options={{
        responsive: true,
        plugins: {
          legend: { position: 'bottom', labels: { font: { size: 10 }, boxWidth: 12 } },
        },
        scales: {
          x: { stacked: true },
          y: { stacked: true, beginAtZero: true },
        },
      }}
    />
  );
}
