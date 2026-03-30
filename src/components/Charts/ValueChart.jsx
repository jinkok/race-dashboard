import { getBadgeStyle } from '../../utils/getBadgeStyle.js';
import { useMemo } from 'react';

const ValueChart = ({ data, color, valueKey }) => {
  const { parsedData, max } = useMemo(() => {
    if (!data || data.length === 0) return { parsedData: [], max: 1 };

    const parsed = data.map(d => {
      const rawVal = d[valueKey];
      const strVal = String(rawVal || '0');
      const numVal = parseFloat(strVal.replace(/[^0-9.]/g, '')) || 0;
      return { ...d, val: numVal, raw: rawVal };
    });

    const mx = Math.max(...parsed.map(d => d.val)) || 1;
    return { parsedData: parsed, max: mx };
  }, [data, valueKey]);

  if (!parsedData || parsedData.length === 0) return null;

  return (
    <div className="space-y-3">
      {parsedData.map((item, idx) => {
        const percentage = (item.val / max) * 100;
        const isTop = idx === 0;
        let barColorClass = 'bg-blue-500';
        if (color === 'green') barColorClass = 'bg-emerald-500';
        if (color === 'purple') barColorClass = 'bg-purple-500';

        return (
          <div key={idx} className="flex items-center gap-3">
            <div className="w-6 shrink-0 flex justify-center">
              <span className={`w-6 h-6 rounded-full text-[11px] font-bold flex items-center justify-center ${getBadgeStyle(item.no)}`}>
                {item.no}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-end justify-between mb-1">
                <span className={`text-xs truncate ${isTop ? 'font-black text-slate-900' : 'font-medium text-slate-600'}`}>
                  {item.name}
                </span>
              </div>
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden relative">
                <div
                  className={`h-full rounded-full bar-fill ${barColorClass}`}
                  style={{ width: `${percentage}%` }}
                ></div>
              </div>
            </div>
            <div className={`w-16 text-right font-mono text-xs tabular font-bold ${isTop ? 'text-slate-900' : 'text-slate-500'}`}>
              {item.raw}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ValueChart;

