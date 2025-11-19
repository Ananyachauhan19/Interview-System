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
}) {
  const inputRef = useRef(null);
  const flatpickrRef = useRef(null);

  useEffect(() => {
    if (!inputRef.current) return;

    const options = {
      enableTime,
      dateFormat: enableTime ? 'Y-m-d H:i' : 'Y-m-d',
      time_24hr: false,
      minuteIncrement: 1,
      defaultDate: value || null,
      minDate: min || null,
      maxDate: max || null,
      onChange: (selectedDates) => {
        if (selectedDates.length > 0) {
          const date = selectedDates[0];
          // Enforce allowed hours (10:00 - 22:00) and future time
          const now = new Date();
          const hour = date.getHours();
          if (hour < 10 || hour >= 22) {
            // Auto-adjust to nearest valid hour inside window
            const adjusted = new Date(date.getTime());
            if (hour < 10) adjusted.setHours(10, 0, 0, 0);
            else adjusted.setHours(21, 59, 0, 0);
            flatpickrRef.current.setDate(adjusted, true);
            return;
          }
          if (date.getTime() <= now.getTime()) {
            // Move to next allowable future minute within window
            const future = new Date(now.getTime() + 60 * 1000);
            if (future.getHours() < 10) future.setHours(10, 0, 0, 0);
            if (future.getHours() >= 22) {
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
        }
      },
      onReady: (selectedDates, dateStr, instance) => {
        // Add custom styling to the calendar - check if container exists
        if (instance.calendarContainer) {
          instance.calendarContainer.classList.add('flatpickr-custom');
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
        .flatpickr-custom {
          font-family: inherit;
        }
        
        .flatpickr-calendar {
          border-radius: 8px;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
          border: 1px solid #e5e7eb;
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
        
        .flatpickr-months .flatpickr-month {
          background: #0ea5e9;
          color: white;
          border-radius: 8px 8px 0 0;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 10px;
        }

        .flatpickr-months .flatpickr-prev-month,
        .flatpickr-months .flatpickr-next-month {
          position: static;
          height: 28px;
          padding: 4px;
        }

        .flatpickr-current-month {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 0;
          height: 28px;
        }
        
        .flatpickr-current-month .flatpickr-monthDropdown-months {
          background: #0ea5e9;
          color: white;
          font-weight: 600;
          border: none;
          padding: 6px 10px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          height: 28px;
        }

        .flatpickr-current-month .flatpickr-monthDropdown-months:hover {
          background: #0284c7;
        }

        .flatpickr-current-month .flatpickr-monthDropdown-months option {
          background: #e0f2fe;
          color: white;
          padding: 8px;
        }

        .flatpickr-current-month .flatpickr-monthDropdown-months option:hover {
          background: #bae6fd;
        }

        .flatpickr-current-month .flatpickr-monthDropdown-months option:checked {
          background: #0ea5e9;
          color: white;
        }
        
        .flatpickr-current-month .numInputWrapper {
          color: white;
          height: 28px;
          display: inline-flex;
          align-items: center;
          position: relative;
        }

        .flatpickr-current-month .numInputWrapper input {
          color: white !important;
          font-weight: 600;
          background: transparent;
          border: none;
          padding: 5px 24px 5px 8px;
          width: 70px;
          text-align: left;
          font-size: 14px;
          height: 28px;
          line-height: 18px;
        }

        .flatpickr-current-month .numInputWrapper input:hover {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
        }

        .flatpickr-current-month .numInputWrapper .arrowUp,
        .flatpickr-current-month .numInputWrapper .arrowDown {
          position: absolute;
          right: 2px;
          width: 16px;
          height: 14px;
          padding: 0 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        .flatpickr-current-month .numInputWrapper .arrowUp {
          top: 0;
        }

        .flatpickr-current-month .numInputWrapper .arrowDown {
          bottom: 0;
        }

        .flatpickr-current-month .numInputWrapper .arrowUp:hover,
        .flatpickr-current-month .numInputWrapper .arrowDown:hover {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 3px;
        }

        .flatpickr-current-month .numInputWrapper span.arrowUp:after {
          border-bottom-color: white;
        }

        .flatpickr-current-month .numInputWrapper span.arrowDown:after {
          border-top-color: white;
        }
        
        .flatpickr-weekday {
          color: #0ea5e9;
          font-weight: 600;
        }
        
        .flatpickr-time input {
          color: #1f2937;
          font-weight: 500;
        }
        
        .flatpickr-time .flatpickr-am-pm {
          color: #1f2937;
          font-weight: 600;
        }
        
        .flatpickr-time input:hover,
        .flatpickr-time .flatpickr-am-pm:hover {
          background: #e0f2fe;
        }
        
        .flatpickr-calendar.arrowTop:before {
          border-bottom-color: #e5e7eb;
        }
        
        .flatpickr-calendar.arrowTop:after {
          border-bottom-color: #0ea5e9;
        }
      `}</style>
    </div>
  );
}
