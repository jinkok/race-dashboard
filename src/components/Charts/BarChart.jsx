import { getBadgeStyle } from '../../utils/getBadgeStyle.js';
import { useMemo } from 'react';

const BarChart = ({ data, color }) => {
  const { parsedData, min, max, range } = useMemo(() => {
    if (!data || data.length === 0) {
      return { parsedData: [], min: 0, max: 0, range: 1 };
    }

    const parsed = data.map(d => ({
      ...d,
      val: parseFloat(String(d.rec).replace(/[^0-9.]/g, '')) || 0,
    }));

    const mn = Math.min(...parsed.map(d => d.val));
    const mx = Math.max(...parsed.map(d => d.val));
    const rng = mx - mn || 1;

    return { parsedData: parsed, min: mn, max: mx, range: rng };
  }, [data]);

  if (!parsedData || parsedData.length === 0) return null;

  return (
    <div className="space-y-3">
      {parsedData.map((item, idx) => {
        const percentage = 100 - ((item.val - min) / range) * 40;
        const isTop = idx === 0;
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
                  className={`h-full rounded-full bar-fill ${color === 'red' ? 'bg-red-500' : 'bg-blue-500'}`}
                  style={{ width: `${percentage}%` }}
                ></div>
              </div>
            </div>
            <div className={`w-12 text-right font-mono text-xs tabular font-bold ${isTop ? (color === 'red' ? 'text-red-600' : 'text-blue-600') : 'text-slate-500'}`}>
              {item.rec}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default BarChart;

