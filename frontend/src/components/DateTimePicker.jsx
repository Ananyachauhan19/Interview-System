import React, { useEffect, useRef } from 'react';
import flatpickr from 'flatpickr';
import 'flatpickr/dist/flatpickr.min.css';
import { Calendar, Clock } from 'lucide-react';

/**
 * Cross-browser DateTimePicker component using Flatpickr
 * @param {string} value - ISO datetime string (YYYY-MM-DDTHH:mm)
 * @param {function} onChange - Callback with ISO datetime string
 * @param {string} min - Minimum datetime (ISO format)
 * @param {string} max - Maximum datetime (ISO format)
 * @param {string} placeholder - Input placeholder
 * @param {string} className - Additional CSS classes
 * @param {boolean} disabled - Disable input
 * @param {boolean} enableTime - Enable time picker (default: true)
 */
export default function DateTimePicker({
  value,
  onChange,
  min,
  max,
  placeholder = 'Select date and time',
  className = '',
  disabled = false,
  enableTime = true,
  isEnd = false,
}) {
  const inputRef = useRef(null);
  const flatpickrRef = useRef(null);
  const lastSelectedDateRef = useRef(null);

  useEffect(() => {
    if (!inputRef.current) return;

    const options = {
      enableTime,
      dateFormat: enableTime ? 'Y-m-d H:i' : 'Y-m-d',
      time_24hr: false,
      minuteIncrement: 1,
      // Do not fill input on open; only show today's month
      defaultDate: value || null,
      minDate: min || null,
      maxDate: max || null,
      onOpen: (selectedDates, dateStr, instance) => {
        // If no selection yet, just jump calendar view to today without selecting
        if (!instance.selectedDates || instance.selectedDates.length === 0) {
          // Try to restore the last selected date if available
          if (lastSelectedDateRef.current) {
            instance.setDate(new Date(lastSelectedDateRef.current.getTime()), false);
          } else if (value) {
            const vd = new Date(value);
            if (!isNaN(vd.getTime())) instance.setDate(vd, false);
            else instance.jumpToDate(new Date());
          } else {
            instance.jumpToDate(new Date());
          }
        }
      },
      onChange: (selectedDates) => {
        if (selectedDates.length > 0) {
          const date = selectedDates[0];
          // Remember last selected date (with current time)
          lastSelectedDateRef.current = new Date(date.getTime());
          // Determine if only date was selected (default midnight)
          const isDateOnlyPick = date.getHours() === 0 && date.getMinutes() === 0;

          // Default time behavior
          if (isDateOnlyPick) {
            const picked = new Date(date);
            const now = new Date();
            const sameDayAsNow = picked.getFullYear() === now.getFullYear() && picked.getMonth() === now.getMonth() && picked.getDate() === now.getDate();

            // If this picker is used for end-time, set 22:00 by default for picked day
            if (isEnd) {
              // End time default 22:00 of picked day
              picked.setHours(22, 0, 0, 0);
              flatpickrRef.current.setDate(picked, true);
              return;
            }

            // Start time default: 10:00 or current time if after 10:00, capped at 22:00:00
            if (sameDayAsNow) {
              const currentH = now.getHours();
              if (currentH < 10) picked.setHours(10, 0, 0, 0);
              else if (currentH > 22 || (currentH === 22 && now.getMinutes() > 0)) picked.setHours(22, 0, 0, 0);
              else picked.setHours(currentH, now.getMinutes(), 0, 0);
            } else {
              picked.setHours(10, 0, 0, 0);
            }
            flatpickrRef.current.setDate(picked, true);
            return;
          }

          // Enforce allowed hours window (10:00 - 22:00, minutes past 00 not allowed at 22:00)
          const now = new Date();
          const hour = date.getHours();
          if (hour < 10 || hour > 22 || (hour === 22 && date.getMinutes() > 0)) {
            const adjusted = new Date(date.getTime());
            if (hour < 10) adjusted.setHours(10, 0, 0, 0);
            else adjusted.setHours(22, 0, 0, 0);
            flatpickrRef.current.setDate(adjusted, true);
            return;
          }

          // For start picker (no min), prevent picking past
          if (!min && date.getTime() <= now.getTime()) {
            // Move to next allowable future minute within window
            const future = new Date(now.getTime() + 60 * 1000);
            if (future.getHours() < 10) future.setHours(10, 0, 0, 0);
            if (future.getHours() > 22 || (future.getHours() === 22 && future.getMinutes() > 0)) {
              // move to next day 10:00
              future.setDate(future.getDate() + 1);
              future.setHours(10, 0, 0, 0);
            }
            flatpickrRef.current.setDate(future, true);
            return;
          }
          // Convert to ISO format (YYYY-MM-DDTHH:mm)
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          const hours = String(date.getHours()).padStart(2, '0');
          const minutes = String(date.getMinutes()).padStart(2, '0');
          
          const isoString = enableTime 
            ? `${year}-${month}-${day}T${hours}:${minutes}`
            : `${year}-${month}-${day}`;
          
          onChange(isoString);
          // Update stored last selected date again after potential external updates
          try { lastSelectedDateRef.current = new Date(date.getTime()); } catch {}
          // Refresh hour/minute disabled states if helper present
          try {
            if (flatpickrRef.current && flatpickrRef.current.updateTimeDisabledStates) {
              flatpickrRef.current.updateTimeDisabledStates();
            }
          } catch {}
        }
      },
      onReady: (selectedDates, dateStr, instance) => {
        // Add custom styling to the calendar - check if container exists
        if (instance.calendarContainer) {
          instance.calendarContainer.classList.add('flatpickr-custom');
          
          // Increase calendar width
          instance.calendarContainer.style.width = 'auto';
          
          // Restructure DOM to place time picker beside calendar
          if (enableTime && instance.timeContainer) {
            const timeContainer = instance.timeContainer;
            const innerContainer = instance.innerContainer;
            
            // Apply inline styles to override Flatpickr defaults
            Object.assign(timeContainer.style, {
              display: 'flex',
              flexDirection: 'column',
              gap: '0px',
              position: 'static',
              width: '200px',
              minWidth: '200px',
              height: '100%',
              minHeight: '280px',
              padding: '0',
              paddingTop: '0',
              marginTop: '0',
              background: 'transparent',
              border: 'none',
              borderLeft: '1px solid #e2e8f0',
              margin: '0',
              visibility: 'visible',
              opacity: '1',
              boxSizing: 'border-box'
            });
            
            // Apply inline styles to innerContainer
            Object.assign(innerContainer.style, {
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'stretch',
              gap: '0'
            });
            
            // Set calendar width to proper size
            if (instance.rContainer) {
              instance.rContainer.style.width = '308px';
            }
            if (instance.days) {
              instance.days.style.width = '308px';
            }
            
            // Move time container inside innerContainer
            if (timeContainer.parentElement !== innerContainer) {
              innerContainer.appendChild(timeContainer);
            }
            
            // Get the weekdays element to match its styling
            const weekdaysElement = instance.weekdayContainer;
            let weekdayHeight = '28px';
            let weekdayPadding = '0';
            
            if (weekdaysElement) {
              const computedStyle = window.getComputedStyle(weekdaysElement);
              weekdayHeight = computedStyle.height;
              weekdayPadding = computedStyle.padding;
            }
            
            // Rearrange time picker elements in columns
            const hourInput = timeContainer.querySelector('.flatpickr-hour');
            const minuteInput = timeContainer.querySelector('.flatpickr-minute');
            const amPm = timeContainer.querySelector('.flatpickr-am-pm');
            const separator = timeContainer.querySelector('.flatpickr-time-separator');
            
            if (separator) {
              separator.style.display = 'none';
            }
            
            if (hourInput && minuteInput && amPm) {
              // Clear and rebuild
              timeContainer.innerHTML = '';
              
              // Add "Select Time" heading - matching exact weekday row height and padding
              const heading = document.createElement('div');
              heading.textContent = 'Select Time';
              heading.style.cssText = `width: 100%; text-align: center; font-size: 13px; font-weight: 600; color: #0ea5e9; height: ${weekdayHeight}; padding: ${weekdayPadding}; display: flex; align-items: center; justify-content: center; background: transparent; border-bottom: 1px solid #e2e8f0; box-sizing: border-box;`;
              timeContainer.appendChild(heading);
              
              // Create column labels container
              const labelsContainer = document.createElement('div');
              labelsContainer.style.cssText = 'display: flex; gap: 8px; height: 28px; padding: 0 16px; align-items: center; border-bottom: 1px solid #e2e8f0;';
              
              const hourLabel = document.createElement('div');
              hourLabel.textContent = 'Hour';
              hourLabel.style.cssText = 'width: 50px; font-size: 11px; font-weight: 600; color: #64748b; text-align: center;';
              labelsContainer.appendChild(hourLabel);
              
              const minuteLabel = document.createElement('div');
              minuteLabel.textContent = 'Minute';
              minuteLabel.style.cssText = 'width: 50px; font-size: 11px; font-weight: 600; color: #64748b; text-align: center;';
              labelsContainer.appendChild(minuteLabel);
              
              const periodLabel = document.createElement('div');
              periodLabel.textContent = 'Period';
              periodLabel.style.cssText = 'width: 50px; font-size: 11px; font-weight: 600; color: #64748b; text-align: center;';
              labelsContainer.appendChild(periodLabel);
              
              timeContainer.appendChild(labelsContainer);
              
              // Create columns container
              const columnsContainer = document.createElement('div');
              columnsContainer.style.cssText = 'display: flex; gap: 8px; align-items: flex-start; padding: 10px 16px; justify-content: center;';
              
              // Hour column with all options (1-12)
              const hourColumn = document.createElement('div');
              hourColumn.style.cssText = 'display: flex; flex-direction: column; align-items: center;';
              
              const hourScroller = document.createElement('div');
              hourScroller.className = 'time-scroller';
              hourScroller.style.cssText = 'width: 50px; height: 168px; overflow-y: auto; overflow-x: hidden; scrollbar-width: none; border: 1px solid #e2e8f0; border-radius: 8px; background: #fafafa; position: relative;';
              
              // Generate hours 1-12
              for (let i = 1; i <= 12; i++) {
                const hourOption = document.createElement('div');
                hourOption.textContent = i.toString().padStart(2, '0');
                hourOption.className = 'time-option';
                hourOption.style.cssText = 'height: 36px; display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: 500; color: #475569; cursor: pointer; transition: all 0.2s;';
                hourOption.addEventListener('click', () => {
                  // Visual highlight within hour column
                  Array.from(hourScroller.children).forEach(opt => {
                    opt.style.background = 'transparent';
                    opt.style.color = '#475569';
                    opt.style.fontWeight = '500';
                  });
                  hourOption.style.background = '#0ea5e9';
                  hourOption.style.color = '#ffffff';
                  hourOption.style.fontWeight = '600';
                  // Sync hidden input and apply via Flatpickr API
                  hourInput.value = i;
                  const period = (amPm.value || 'AM').toUpperCase();
                  const minute = parseInt(minuteInput.value || '0', 10);
                  if (typeof applyTime === 'function') applyTime(i, minute, period);
                });
                hourScroller.appendChild(hourOption);
              }
              hourScroller.style.scrollbarWidth = 'none';
              hourScroller.style.msOverflowStyle = 'none';
              const hourStyle = document.createElement('style');
              hourStyle.textContent = '.time-scroller::-webkit-scrollbar { display: none; }';
              document.head.appendChild(hourStyle);
              
              hourColumn.appendChild(hourScroller);
              columnsContainer.appendChild(hourColumn);
              
              // Minute column with all options (00-59)
              const minuteColumn = document.createElement('div');
              minuteColumn.style.cssText = 'display: flex; flex-direction: column; align-items: center;';
              
              const minuteScroller = document.createElement('div');
              minuteScroller.className = 'time-scroller';
              minuteScroller.style.cssText = 'width: 50px; height: 168px; overflow-y: auto; overflow-x: hidden; scrollbar-width: none; border: 1px solid #e2e8f0; border-radius: 8px; background: #fafafa; position: relative;';
              
              // Generate minutes 00-59
              for (let i = 0; i <= 59; i++) {
                const minuteOption = document.createElement('div');
                minuteOption.textContent = i.toString().padStart(2, '0');
                minuteOption.className = 'time-option';
                minuteOption.style.cssText = 'height: 36px; display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: 500; color: #475569; cursor: pointer; transition: all 0.2s;';
                minuteOption.addEventListener('click', () => {
                  // Visual highlight within minute column
                  Array.from(minuteScroller.children).forEach(opt => {
                    opt.style.background = 'transparent';
                    opt.style.color = '#475569';
                    opt.style.fontWeight = '500';
                  });
                  minuteOption.style.background = '#0ea5e9';
                  minuteOption.style.color = '#ffffff';
                  minuteOption.style.fontWeight = '600';
                  // Sync hidden input and apply via Flatpickr API
                  minuteInput.value = i;
                  const h12 = parseInt(hourInput.value || '12', 10);
                  const period = (amPm.value || 'AM').toUpperCase();
                  if (typeof applyTime === 'function') applyTime(h12, i, period);
                });
                minuteScroller.appendChild(minuteOption);
              }
              
              minuteColumn.appendChild(minuteScroller);
              columnsContainer.appendChild(minuteColumn);
              
              // AM/PM column (always show both options)
              const amPmColumn = document.createElement('div');
              amPmColumn.style.cssText = 'display: flex; flex-direction: column; align-items: center;';

              // Keep original amPm input hidden to sync with Flatpickr
              amPm.style.display = 'none';
              amPmColumn.appendChild(amPm);

              const ampmBox = document.createElement('div');
              ampmBox.style.cssText = 'width: 50px; height: 168px; border: 1px solid #e2e8f0; border-radius: 8px; background: #fafafa; display: flex; flex-direction: column; overflow: hidden;';
              const amOption = document.createElement('div');
              amOption.textContent = 'AM';
              amOption.className = 'ampm-option';
              amOption.style.cssText = 'flex: 1; display:flex; align-items:center; justify-content:center; font-size:16px; font-weight:600; color:#475569; cursor:pointer;';
              const pmOption = document.createElement('div');
              pmOption.textContent = 'PM';
              pmOption.className = 'ampm-option';
              pmOption.style.cssText = 'flex: 1; display:flex; align-items:center; justify-content:center; font-size:16px; font-weight:600; color:#475569; cursor:pointer; border-top:1px solid #e2e8f0;';
              ampmBox.appendChild(amOption);
              ampmBox.appendChild(pmOption);
              amPmColumn.appendChild(ampmBox);
              columnsContainer.appendChild(amPmColumn);
              
              timeContainer.appendChild(columnsContainer);
              
              // Hide original inputs
              hourInput.style.display = 'none';
              minuteInput.style.display = 'none';

              // Helpers: selected/disabled styling
              const setActive = (el, active) => {
                if (!el) return;
                el.style.background = active ? '#0ea5e9' : 'transparent';
                el.style.color = active ? '#ffffff' : '#475569';
              };
              // Hide/show a time option (hour/minute)
              const setHiddenOption = (el, hidden) => {
                if (!el) return;
                el.style.display = hidden ? 'none' : 'flex';
                if (!hidden) {
                  el.style.color = '#475569';
                }
              };
              // Disable/enable AM or PM (do not hide)
              const setAmPmDisabled = (el, disabled) => {
                if (!el) return;
                el.classList.toggle('disabled', !!disabled);
                el.style.pointerEvents = disabled ? 'none' : 'auto';
                el.style.opacity = '1';
              };

              // Click handlers should also re-evaluate minute disables
              hourScroller.querySelectorAll('.time-option').forEach((opt, idx) => {
                opt.addEventListener('click', () => {
                  updateDisabledStates(idx + 1);
                });
              });

              // Build arrays for update function
              const hourOptions = Array.from(hourScroller.children);
              const minuteOptions = Array.from(minuteScroller.children);

              // Helpers to apply time via Flatpickr API
              const hasSelectedDate = () => !!(instance.selectedDates && instance.selectedDates[0]);
              const getBaseDate = () => {
                if (hasSelectedDate()) return new Date(instance.selectedDates[0].getTime());
                if (lastSelectedDateRef.current) return new Date(lastSelectedDateRef.current.getTime());
                if (value) {
                  const d = new Date(value);
                  if (!isNaN(d.getTime())) return d;
                }
                return null;
              };
              const to24h = (h12, period) => {
                let h = h12 % 12;
                if (period === 'PM') h += 12;
                return h;
              };
              const applyTime = (h12, m, period) => {
                const base = getBaseDate();
                if (!base) return; // No prior date to apply time to
                const h24 = to24h(h12, (period || 'AM').toUpperCase());
                base.setHours(h24, m || 0, 0, 0);
                if (flatpickrRef.current) {
                  flatpickrRef.current.setDate(base, true);
                }
              };
              // AM/PM selection handlers (apply via setDate)
              const selectPeriod = (period) => {
                amPm.value = period;
                setActive(amOption, period === 'AM');
                setActive(pmOption, period === 'PM');
                amOption.classList.toggle('active', period === 'AM');
                pmOption.classList.toggle('active', period === 'PM');
                const currentHour = parseInt(hourInput.value || '12', 10);
                const currentMinute = parseInt(minuteInput.value || '0', 10);
                applyTime(currentHour, currentMinute, period);
              };
              amOption.addEventListener('click', () => selectPeriod('AM'));
              pmOption.addEventListener('click', () => selectPeriod('PM'));

              const getCurrent12h = () => {
                const now = new Date();
                const h24 = now.getHours();
                const period = h24 >= 12 ? 'PM' : 'AM';
                let h12 = h24 % 12; if (h12 === 0) h12 = 12;
                return { h12, period, minute: now.getMinutes(), date: now };
              };
              const parseDateStr = (s) => {
                if (!s) return null;
                const d = new Date(s);
                return isNaN(d.getTime()) ? null : d;
              };
              const minDateTime = parseDateStr(min);
              const isTodaySelected = () => {
                const d = instance.selectedDates && instance.selectedDates[0];
                if (!d) return false;
                const n = new Date();
                return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
              };
              const isMinDaySelected = () => {
                const d = instance.selectedDates && instance.selectedDates[0];
                if (!d || !minDateTime) return false;
                return d.getFullYear() === minDateTime.getFullYear() && d.getMonth() === minDateTime.getMonth() && d.getDate() === minDateTime.getDate();
              };
              const comparePeriod = (a, b) => (a === b ? 0 : a === 'AM' ? -1 : 1);
              const isHourAllowedByWindow = (period, h12) => {
                if (period === 'AM') return h12 >= 10 && h12 <= 11; // 10am, 11am
                // PM: 12(noon) to 10pm inclusive; 11pm not allowed
                return h12 === 12 || (h12 >= 1 && h12 <= 10);
              };

              const updateDisabledStates = () => {
                const today = isTodaySelected();
                const nowInfo = getCurrent12h();
                const selPeriod = (amPm.value || 'AM').toUpperCase();
                const selHour = parseInt(hourInput.value || '12', 10);
                const minDay = isMinDaySelected();
                const refPeriod = minDay && minDateTime
                  ? (minDateTime.getHours() >= 12 ? 'PM' : 'AM')
                  : nowInfo.period;
                let refHour12;
                if (minDay && minDateTime) {
                  const h24 = minDateTime.getHours();
                  refHour12 = h24 % 12; if (refHour12 === 0) refHour12 = 12;
                } else {
                  refHour12 = nowInfo.h12;
                }
                const refMinute = minDay && minDateTime ? minDateTime.getMinutes() : nowInfo.minute;

                // Hours
                hourOptions.forEach((opt, i) => {
                  const hourVal = i + 1; // 1..12
                  let hide = false;
                  // Allowed window first
                  if (!isHourAllowedByWindow(selPeriod, hourVal)) hide = true;
                  // Relative to reference (now for start, min for end) when same day
                  if (!hide && (today || minDay)) {
                    const rel = comparePeriod(selPeriod, refPeriod);
                    if (rel < 0) hide = true; // Entire earlier period
                    else if (rel === 0 && hourVal < refHour12) hide = true; // Earlier hour in same period
                  }
                  setHiddenOption(opt, hide);
                });

                // Minutes
                minuteOptions.forEach((opt, i) => {
                  let hide = false;
                  // At 10 PM allow only 00 minute
                  if (selPeriod === 'PM' && selHour === 10) hide = i > 0;
                  // Relative reference minute only when same period, same hour, and same day/minDay
                  if (!hide && (today || minDay)) {
                    const rel = comparePeriod(selPeriod, refPeriod);
                    if (rel < 0) hide = true;
                    else if (rel === 0 && selHour === refHour12 && i < refMinute) hide = true;
                  }
                  setHiddenOption(opt, hide);
                });

                // AM/PM disabling rule
                const allowedAM = isHourAllowedByWindow('AM', 10) || isHourAllowedByWindow('AM', 11);
                const allowedPM = isHourAllowedByWindow('PM', 12) || isHourAllowedByWindow('PM', 1);
                let disableAM = !allowedAM;
                let disablePM = !allowedPM;
                if (today || minDay) {
                  // If reference period is PM and same day, AM becomes invalid
                  if (refPeriod === 'PM') disableAM = true;
                }
                setAmPmDisabled(amOption, disableAM);
                setAmPmDisabled(pmOption, disablePM);
                if (disableAM && selPeriod === 'AM') selectPeriod('PM');
              };

              // Expose updater to instance for external calls (onChange)
              instance.updateTimeDisabledStates = updateDisabledStates;
              flatpickrRef.current.updateTimeDisabledStates = updateDisabledStates;

              // Initialize selected AM/PM from input value
              selectPeriod((amPm.value || 'AM').toUpperCase());
              updateDisabledStates();
            }
          }
        }
      },
    };

    flatpickrRef.current = flatpickr(inputRef.current, options);

    return () => {
      if (flatpickrRef.current && typeof flatpickrRef.current.destroy === 'function') {
        flatpickrRef.current.destroy();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [min, max, enableTime]);

  // Update value when prop changes
  useEffect(() => {
    if (flatpickrRef.current && value) {
      flatpickrRef.current.setDate(value);
    }
  }, [value]);

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        placeholder={placeholder}
        disabled={disabled}
        className={`w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all disabled:bg-gray-100 disabled:cursor-not-allowed ${className}`}
        readOnly
      />
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        {enableTime ? (
          <Clock size={18} className="text-gray-400" />
        ) : (
          <Calendar size={18} className="text-gray-400" />
        )}
      </div>
      
      <style>{`
        /* Base calendar styling */
        .flatpickr-calendar {
          border-radius: 12px;
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.12);
          border: 1px solid #e5e7eb;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          padding: 0;
        }
        
        /* Header styling */
        .flatpickr-months .flatpickr-month {
          background: #0ea5e9;
          color: white;
          height: 44px;
          border-radius: 12px 12px 0 0;
          padding: 0;
        }
        
        .flatpickr-current-month {
          padding: 0 8px;
        }
        
        .flatpickr-current-month .flatpickr-monthDropdown-months {
          background: transparent;
          color: white;
          font-weight: 600;
          font-size: 16px;
          border: none;
        }
        
        .flatpickr-current-month .numInputWrapper {
          color: white;
        }
        
        .flatpickr-current-month .numInputWrapper input {
          color: white !important;
          font-weight: 600;
          font-size: 16px;
        }
        
        .flatpickr-months .flatpickr-prev-month,
        .flatpickr-months .flatpickr-next-month {
          fill: white;
        }
        
        .flatpickr-months .flatpickr-prev-month:hover svg,
        .flatpickr-months .flatpickr-next-month:hover svg {
          fill: rgba(255, 255, 255, 0.8);
        }
        
        /* Weekday headers */
        .flatpickr-weekday {
          color: #0ea5e9;
          font-weight: 600;
          font-size: 13px;
        }
        
        /* Day cells */
        .flatpickr-day {
          border-radius: 8px;
          font-weight: 500;
        }
        
        .flatpickr-day.selected,
        .flatpickr-day.selected:hover {
          background: #0ea5e9;
          border-color: #0ea5e9;
        }
        
        .flatpickr-day:hover {
          background: #e0f2fe;
          border-color: #e0f2fe;
        }
        
        .flatpickr-day.today {
          border-color: #0ea5e9;
        }
        
        /* Side-by-side layout for time picker */
        .flatpickr-custom .flatpickr-innerContainer {
          display: flex !important;
          flex-direction: row !important;
          align-items: stretch !important;
          gap: 0 !important;
        }
        
        .flatpickr-custom .flatpickr-rContainer {
          flex: 0 0 auto;
          width: 308px !important;
        }
        
        .flatpickr-custom .flatpickr-days {
          width: 308px !important;
        }
        
        .flatpickr-custom .flatpickr-day {
          height: 39px !important;
          line-height: 39px !important;
          max-width: 44px !important;
        }
        
        /* iOS-style time picker panel */
        .flatpickr-custom .flatpickr-time {
          display: flex !important;
          flex-direction: column !important;
          padding: 20px 16px !important;
          border-left: 1px solid #e2e8f0 !important;
        }
        
        /* Hide separator and default inputs */
        .flatpickr-custom .flatpickr-time .flatpickr-time-separator,
        .flatpickr-custom .flatpickr-time .numInputWrapper {
          display: none !important;
        }
        
        /* Time option hover effect - darker for contrast */
        .time-option:hover {
          background: #dbeafe !important;
          color: #0ea5e9 !important;
        }
        .time-option.disabled { 
          color: #94a3b8 !important; 
          background: transparent !important; 
          cursor: default !important; 
          pointer-events: none !important; 
          opacity: 0.6 !important; 
        }
        .ampm-option { transition: background 0.2s, color 0.2s; }
        .ampm-option:hover { background: #dbeafe; color: #0ea5e9; }
        .ampm-option.active { background: #0ea5e9; color: #ffffff; }
        .ampm-option.disabled { background: #e5e7eb !important; color: #94a3b8 !important; }
        
        /* Gradient fade for scrollers */
        .time-scroller::before,
        .time-scroller::after {
          content: '';
          position: absolute;
          left: 0;
          right: 0;
          height: 30px;
          pointer-events: none;
          z-index: 1;
        }
        
        .time-scroller::before {
          top: 0;
          background: linear-gradient(to bottom, #f1f5f9, transparent);
          border-radius: 8px 8px 0 0;
        }
        
        .time-scroller::after {
          bottom: 0;
          background: linear-gradient(to top, #f1f5f9, transparent);
          border-radius: 0 0 8px 8px;
        }
      `}</style>
    </div>
  );
}
