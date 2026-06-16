import React, { useEffect, useState } from 'react';

interface TemplateUsage {
  name: string;
  contractType: string;
  isDefault: boolean;
  usageCount: number;
}

export function TemplateUsageChart() {
  const [data, setData] = useState<TemplateUsage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.electronAPI.analyticsTemplateUsage().then((d) => {
      setData(d);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="h-48 flex items-center justify-center text-gray-400">Loading...</div>;
  if (data.length === 0) return <div className="h-48 flex items-center justify-center text-gray-400">No templates yet</div>;

  const maxUsage = Math.max(...data.map((d) => d.usageCount), 1);

  return (
    <div className="space-y-2 max-h-64 overflow-auto">
      {data.map((tmpl) => (
        <div key={tmpl.name}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-700 truncate flex items-center gap-1.5">
              {tmpl.isDefault && <span className="text-indigo-500">★</span>}
              {tmpl.name}
            </span>
            <span className="text-xs font-medium text-gray-500">{tmpl.usageCount}</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div
              className={`h-2 rounded-full ${tmpl.usageCount > 0 ? 'bg-blue-500' : 'bg-gray-200'}`}
              style={{ width: `${(tmpl.usageCount / maxUsage) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
