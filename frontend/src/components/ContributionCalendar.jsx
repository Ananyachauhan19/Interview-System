import React, { useMemo } from 'react';

// Helper to generate rolling 365 days from today backwards
function getRolling365Days() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - 364);
  
  const monthsMap = new Map();
  const currentDate = new Date(startDate);
  
  while (currentDate <= today) {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const key = `${year}-${month}`;
    
    if (!monthsMap.has(key)) {
      monthsMap.set(key, {
        year,
        month,
        days: []
      });
    }
    
    monthsMap.get(key).days.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  // Convert map to array and fill weeks
  const months = Array.from(monthsMap.values());
  
  // Add padding to first month to align with week grid
  if (months.length > 0) {
    const firstDay = months[0].days[0];
    const startDayOfWeek = firstDay.getDay();
    const padding = [];
    for (let i = 0; i < startDayOfWeek; i++) {
      padding.push(null);
    }
    months[0].days = [...padding, ...months[0].days];
  }
  
  return months;
}

function intensityClass(v) {
  // White/gray background with blue shades for activity (with dark mode support)
  if (!v || v <= 0) return 'bg-slate-100 dark:bg-gray-700 border border-slate-200 dark:border-gray-600';
  if (v < 2) return 'bg-blue-200 dark:bg-blue-800';
  if (v < 4) return 'bg-blue-400 dark:bg-blue-600';
  if (v < 7) return 'bg-blue-600 dark:bg-blue-500';
  return 'bg-blue-700 dark:bg-blue-400';
}

export default function ContributionCalendar({ 
  activity = {}, 
  title = 'Contribution Calendar',
  stats = null
}) {
  const months = useMemo(() => getRolling365Days(), []);
  
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-3 flex-wrap">
          <h3 className="text-base font-semibold text-slate-800 dark:text-gray-100">{title}</h3>
          {stats && (
            <div className="flex items-center gap-2 flex-wrap text-xs text-slate-700 dark:text-gray-300">
              <span className="bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded">
                Active Days: <strong>{stats.totalActiveDays || 0}</strong> / {stats.totalDaysInRange || 365}
              </span>
              <span className="bg-violet-50 dark:bg-violet-900/30 px-2 py-1 rounded">
                Current Streak: <strong>{stats.currentStreak || 0}</strong>
              </span>
              <span className="bg-amber-50 dark:bg-amber-900/30 px-2 py-1 rounded">
                Best Streak: <strong>{stats.bestStreak || 0}</strong>
              </span>
            </div>
          )}
        </div>
      </div>
      
      {/* Horizontal scrollable grid */}
      <div className="overflow-x-auto pb-2">
        <div className="flex gap-3 min-w-max">
          {months.map(({ year, month, days }) => {
            const monthName = new Date(year, month, 1).toLocaleString('default', { month: 'short' });
            
            return (
              <div key={`${year}-${month}`} className="flex flex-col">
                <div className="text-xs text-slate-500 dark:text-gray-400 mb-2 text-center font-medium">
                  {monthName}
                </div>
                {/* 7 rows for days of week, columns for weeks */}
                <div className="grid grid-rows-7 grid-flow-col gap-1">
                  {days.map((date, i) => {
                    if (!date) {
                      return <div key={`empty-${i}`} className="w-2.5 h-2.5" />;
                    }
                    const key = date.toISOString().slice(0, 10);
                    const v = activity[key] || 0;
                    const cls = intensityClass(v);
                    const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'short' });
                    const formattedDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                    
                    return (
                      <div
                        key={key}
                        title={`${formattedDate} (${dayOfWeek}): ${v} activities`}
                        className={`w-2.5 h-2.5 rounded-sm ${cls} hover:ring-2 hover:ring-blue-500 dark:hover:ring-blue-400 transition-all cursor-pointer`}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Legend and Stats */}
      <div className="flex items-center justify-between gap-4 mt-4 flex-wrap">
        {stats && (
          <div className="text-xs text-slate-700 dark:text-gray-300 flex gap-3 flex-wrap">
            <span className="bg-emerald-50 dark:bg-emerald-900/30 px-2 py-1 rounded">
              Total Sessions: <strong>{stats.totalSessions || 0}</strong>
            </span>
            <span className="bg-pink-50 dark:bg-pink-900/30 px-2 py-1 rounded">
              Completed Topics: <strong>{stats.totalCompletions || 0}</strong>
            </span>
            <span className="bg-cyan-50 dark:bg-cyan-900/30 px-2 py-1 rounded">
              Total Activities: <strong>{stats.totalActivities || 0}</strong>
            </span>
          </div>
        )}
        
        {/* Intensity legend */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 dark:text-gray-400">Less</span>
          <div className="flex gap-1">
            <div className="w-2.5 h-2.5 bg-slate-100 dark:bg-gray-700 rounded-sm border border-slate-300 dark:border-gray-600" title="No activity" />
            <div className="w-2.5 h-2.5 bg-blue-200 dark:bg-blue-800 rounded-sm" title="1-2 activities" />
            <div className="w-2.5 h-2.5 bg-blue-400 dark:bg-blue-600 rounded-sm" title="3-4 activities" />
            <div className="w-2.5 h-2.5 bg-blue-600 dark:bg-blue-500 rounded-sm" title="5-7 activities" />
            <div className="w-2.5 h-2.5 bg-blue-700 dark:bg-blue-400 rounded-sm" title="8+ activities" />
          </div>
          <span className="text-xs text-slate-500 dark:text-gray-400">More</span>
        </div>
      </div>
    </div>
  );
}
