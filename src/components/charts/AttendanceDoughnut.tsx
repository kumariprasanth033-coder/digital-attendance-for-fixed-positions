import React from 'react';

interface AttendanceDoughnutProps {
  present: number;
  absent: number;
  size?: number;
  title?: string;
}

export const AttendanceDoughnut: React.FC<AttendanceDoughnutProps> = ({
  present,
  absent,
  size = 180,
  title = "Attendance Ratio"
}) => {
  const total = present + absent;
  const pctPresent = total > 0 ? Math.round((present / total) * 100) : 0;
  const pctAbsent = total > 0 ? 100 - pctPresent : 0;

  const strokeWidth = 18;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const presentOffset = circumference - (pctPresent / 100) * circumference;
  const absentOffset = circumference - (pctAbsent / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center p-4">
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          {/* Base track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="#f1f5f9"
            strokeWidth={strokeWidth}
          />
          {/* Absent arc */}
          {total > 0 && (
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="transparent"
              stroke="#f43f5e"
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={0}
              strokeLinecap="round"
            />
          )}
          {/* Present arc */}
          {total > 0 && (
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="transparent"
              stroke="#10b981"
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={presentOffset}
              strokeLinecap="round"
              className="transition-all duration-700 ease-out"
            />
          )}
        </svg>

        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-2xl font-extrabold text-slate-900 font-mono tabular-nums leading-none">
            {pctPresent}%
          </span>
          <span className="text-[11px] text-slate-500 font-medium mt-1">
            Present
          </span>
        </div>
      </div>

      {/* Legend & counts */}
      <div className="flex items-center justify-center gap-5 mt-4 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <span className="text-slate-600">Present:</span>
          <span className="font-mono font-bold text-slate-900 tabular-nums">{present}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
          <span className="text-slate-600">Absent:</span>
          <span className="font-mono font-bold text-slate-900 tabular-nums">{absent}</span>
        </div>
      </div>
    </div>
  );
};
