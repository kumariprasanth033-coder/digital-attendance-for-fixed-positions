import React from 'react';

interface AttendanceBarChartProps {
  data: Array<{
    label: string;
    percentage: number;
    present: number;
    total: number;
  }>;
}

export const AttendanceBarChart: React.FC<AttendanceBarChartProps> = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="h-44 flex items-center justify-center text-xs text-slate-400">
        No attendance sessions to visualize
      </div>
    );
  }

  return (
    <div className="w-full pt-4">
      <div className="h-44 flex items-end justify-between gap-3 px-2 border-b border-slate-200 pb-2">
        {data.map((item, idx) => {
          const heightPct = Math.min(100, Math.max(8, item.percentage));
          return (
            <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group relative">
              {/* Tooltip */}
              <div className="absolute -top-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[10px] py-1 px-2 rounded pointer-events-none whitespace-nowrap z-10 font-mono shadow-md">
                {item.percentage}% ({item.present}/{item.total})
              </div>

              {/* Bar */}
              <div className="w-full max-w-[40px] bg-slate-100 rounded-t-md flex flex-col justify-end overflow-hidden h-full">
                <div
                  style={{ height: `${heightPct}%` }}
                  className={`w-full rounded-t-md transition-all duration-500 ${
                    item.percentage >= 85
                      ? 'bg-emerald-500 group-hover:bg-emerald-600'
                      : item.percentage >= 70
                      ? 'bg-indigo-500 group-hover:bg-indigo-600'
                      : 'bg-rose-500 group-hover:bg-rose-600'
                  }`}
                />
              </div>

              {/* Label */}
              <span className="text-[10px] text-slate-500 font-mono mt-2 truncate w-full text-center">
                {item.label}
              </span>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 px-1 font-mono">
        <span>0%</span>
        <span>Target: 75% Min</span>
        <span>100%</span>
      </div>
    </div>
  );
};
