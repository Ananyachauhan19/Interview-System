import React from 'react';

// Helper to get dates from 12 months for a specific year or current year
function getMonths(year = new Date().getFullYear()) {
  const months = [];
  // Start from January of the specified year
  for (let month = 0; month < 12; month++) {
    months.push({ year, month });
  }
  return months;
}

function getDaysInMonth(year, month) {
  // Get all days for a month, fill 7 rows (weeks)
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startDay = first.getDay(); // 0=Sun
  const daysInMonth = last.getDate();
  
  const days = [];
  // Fill empty cells before month starts
  for (let i = 0; i < startDay; i++) {
    days.push(null);
  }
  // Add actual days
  for (let day = 1; day <= daysInMonth; day++) {
    days.push(new Date(year, month, day));
  }
  return days;
}

function intensityClass(v) {
  // White/gray background with blue shades for activity
  if (!v || v <= 0) return 'bg-slate-100';
  if (v < 2) return 'bg-blue-200';
  if (v < 4) return 'bg-blue-400';
  if (v < 7) return 'bg-blue-600';
  return 'bg-blue-700';
}

export default function ContributionCalendar({ 
  activityByDate = {}, 
  title = 'Contribution Calendar',
  year,
  availableYears = [],
  onYearChange,
  showYearFilter = false,
  stats = null
}) {
  const displayYear = year || new Date().getFullYear();
  const months = getMonths(displayYear);
  
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <h3 className="text-base font-semibold text-slate-800">{title}</h3>
          {stats && (
            <div className="flex items-center gap-2 flex-wrap text-xs text-slate-700">
              <span className="bg-blue-50 px-2 py-1 rounded">
                Active Days: <strong>{stats.totalActiveDays}</strong> / {stats.totalDaysInYear}
              </span>
              <span className="bg-violet-50 px-2 py-1 rounded">
                Current Streak: <strong>{stats.currentStreak || 0}</strong>
              </span>
              <span className="bg-amber-50 px-2 py-1 rounded">
                Best Streak: <strong>{stats.bestStreak || 0}</strong>
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          {showYearFilter && availableYears.length > 0 && onYearChange && (
            <select
              value={displayYear}
              onChange={(e) => onYearChange(parseInt(e.target.value))}
              className="text-xs border border-slate-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {availableYears.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          )}
          <div className="text-xs text-slate-500">{displayYear}</div>
        </div>
      </div>
      {/* Horizontal scrollable grid */}
      <div className="overflow-x-auto pb-2">
        <div className="flex gap-3 min-w-max">
          {months.map(({ year, month }) => {
            const monthName = new Date(year, month, 1).toLocaleString('default', { month: 'short' });
            const days = getDaysInMonth(year, month);
            return (
              <div key={`${year}-${month}`} className="flex flex-col">
                <div className="text-xs text-slate-500 mb-2 text-center font-medium">{monthName}</div>
                {/* 7 rows for days of week, columns for weeks */}
                <div className="grid grid-rows-7 grid-flow-col gap-1">
                  {days.map((date, i) => {
                    if (!date) {
                      return <div key={`empty-${i}`} className="w-2.5 h-2.5" />;
                    }
                    const key = date.toISOString().slice(0, 10);
                    const v = activityByDate[key] || 0;
                    const cls = intensityClass(v);
                    return (
                      <div
                        key={key}
                        title={`${key}: ${v} activities`}
                        className={`w-2.5 h-2.5 rounded-sm ${cls} hover:ring-1 hover:ring-slate-400 transition-all cursor-pointer`}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {/* Legend */}
      <div className="flex items-center justify-between gap-2 mt-3">
        {stats && (
          <div className="text-xs text-slate-700 flex gap-3 flex-wrap">
            <span className="bg-indigo-50 px-2 py-1 rounded">
              Courses Enrolled: <strong>{stats.totalCoursesEnrolled || 0}</strong>
            </span>
            <span className="bg-pink-50 px-2 py-1 rounded">
              Problems Solved: <strong>{stats.totalProblemsSolved || 0}</strong>
            </span>
            <span className="bg-teal-50 px-2 py-1 rounded">
              Videos Watched: <strong>{stats.totalVideosWatched || 0}</strong>/{stats.totalVideosTotal || 0}
            </span>
          </div>
        )}
        
        {/* Intensity legend */}
        <span className="text-xs text-slate-500">Less</span>
        <div className="flex gap-1">
          <div className="w-2.5 h-2.5 bg-slate-100 rounded-sm" title="No activity" />
          <div className="w-2.5 h-2.5 bg-blue-200 rounded-sm" title="Low activity" />
          <div className="w-2.5 h-2.5 bg-blue-400 rounded-sm" title="Medium activity" />
          <div className="w-2.5 h-2.5 bg-blue-600 rounded-sm" title="High activity" />
          <div className="w-2.5 h-2.5 bg-blue-700 rounded-sm" title="Very high activity" />
        </div>
        <span className="text-xs text-slate-500">More</span>
      </div>
    </div>
  );
}
