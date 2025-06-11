import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { format, parseISO, isToday, isYesterday, subDays, addDays } from 'date-fns/index.js';
import es from 'date-fns/locale/es/index.js';
import { apiService } from '../utils/api';
import { formatDateForUrl } from '../utils/dateUtils';

export default function CalendarWidget({ compact = false }) {
  const [date, setDate] = useState(new Date());
  const [availableDates, setAvailableDates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [view, setView] = useState('month');
  const [quickLinks, setQuickLinks] = useState([]);
  const router = useRouter();

  // Fetch available dates from API
  useEffect(() => {
    const fetchAvailableDates = async () => {
      try {
        setLoading(true);
        // In a real implementation, this would fetch from the API
        // const response = await apiService.getAvailableDates();
        // setAvailableDates(response.data.dates.map(d => new Date(d)));
        
        // For now, we'll just simulate available dates
        const today = new Date();
        const mockDates = [];
        
        // Generate dates for the last 30 days, skipping weekends
        for (let i = 0; i < 30; i++) {
          const date = subDays(today, i);
          if (date.getDay() !== 0 && date.getDay() !== 6) { // Skip weekends
            mockDates.push(date);
          }
        }
        
        setAvailableDates(mockDates);
        
        // Generate quick links
        const links = [
          { label: 'Hoy', date: today },
          { label: 'Ayer', date: subDays(today, 1) },
          { label: 'Lunes', date: getLastWeekday(1) },
          { label: 'Viernes', date: getLastWeekday(5) },
        ];
        
        setQuickLinks(links);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching available dates:', err);
        setError('Error al cargar las fechas disponibles');
        setLoading(false);
      }
    };

    fetchAvailableDates();
  }, []);

  // Helper function to get the last occurrence of a specific weekday
  const getLastWeekday = (targetDay) => {
    const today = new Date();
    let daysToSubtract = today.getDay() - targetDay;
    
    if (daysToSubtract < 0) {
      daysToSubtract += 7;
    }
    
    return subDays(today, daysToSubtract);
  };

  const isDateAvailable = (date) => {
    return availableDates.some(
      (availableDate) =>
        availableDate.getFullYear() === date.getFullYear() &&
        availableDate.getMonth() === date.getMonth() &&
        availableDate.getDate() === date.getDate()
    );
  };

  const handleDateChange = (newDate) => {
    setDate(newDate);
    
    if (isDateAvailable(newDate)) {
      navigateToDate(newDate);
    }
  };

  const navigateToDate = (date) => {
    const formattedDate = formatDateForUrl(date);
    router.push(`/archive/${formattedDate}`);
  };

  const handleQuickLinkClick = (date) => {
    setDate(date);
    navigateToDate(date);
  };

  const handleViewChange = ({ activeStartDate, view }) => {
    setView(view);
  };

  const tileClassName = ({ date, view }) => {
    if (view === 'month') {
      const classes = [];
      
      if (isDateAvailable(date)) {
        classes.push('available-date');
      }
      
      if (isToday(date)) {
        classes.push('today-date');
      }
      
      return classes.join(' ');
    }
    return null;
  };

  const tileDisabled = ({ date, view }) => {
    // Disable dates in the future
    if (date > new Date()) {
      return true;
    }
    
    // Disable dates that don't have content
    if (view === 'month' && !isDateAvailable(date)) {
      return true;
    }
    
    return false;
  };

  return (
    <div className={`calendar-container p-4 bg-white rounded-lg shadow-md ${compact ? 'text-sm' : ''}`}>
      <style jsx global>{`
        .available-date {
          background-color: #e6f7ff;
          color: #0066cc;
          font-weight: bold;
        }
        .today-date {
          border: 2px solid #0066cc !important;
        }
        .react-calendar {
          border: none;
          width: 100%;
          font-family: inherit;
        }
        .react-calendar__tile--active {
          background: #0066cc;
          color: white;
        }
        .react-calendar__tile--active.available-date {
          background: #0066cc;
          color: white;
        }
        .react-calendar__tile:disabled {
          background-color: #f0f0f0;
          color: #ccc;
        }
        .react-calendar__navigation button:disabled {
          background-color: transparent;
        }
        .react-calendar__tile--now {
          background: transparent;
        }
      `}</style>
      
      <div className="flex justify-between items-center mb-4">
        <h3 className={`${compact ? 'text-base' : 'text-lg'} font-semibold text-center`}>Archivo de Noticias</h3>
        
        {!compact && (
          <div className="text-sm">
            <select
              value={view}
              onChange={(e) => setView(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1 text-sm"
            >
              <option value="month">Mes</option>
              <option value="year">Año</option>
            </select>
          </div>
        )}
      </div>
      
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : error ? (
        <div className="text-center py-4 text-red-500">{error}</div>
      ) : (
        <>
          {!compact && (
            <div className="flex flex-wrap gap-2 mb-4">
              {quickLinks.map((link, index) => (
                <button
                  key={index}
                  onClick={() => handleQuickLinkClick(link.date)}
                  className={`px-3 py-1 text-sm rounded-full ${
                    isDateAvailable(link.date)
                      ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                  disabled={!isDateAvailable(link.date)}
                >
                  {link.label}
                </button>
              ))}
            </div>
          )}
          
          <Calendar
            onChange={handleDateChange}
            value={date}
            tileClassName={tileClassName}
            tileDisabled={tileDisabled}
            maxDate={new Date()}
            minDetail="year"
            view={view}
            onViewChange={handleViewChange}
            locale="es-MX"
            formatShortWeekday={(locale, date) =>
              format(date, 'EEEEE', { locale: es }).toUpperCase()
            }
            formatMonthYear={(locale, date) =>
              format(date, 'MMMM yyyy', { locale: es })
            }
            navigationLabel={({ date, view, label }) =>
              view === 'month'
                ? format(date, 'MMMM yyyy', { locale: es })
                : format(date, 'yyyy', { locale: es })
            }
          />
          
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center">
              <span className="inline-block w-3 h-3 bg-blue-100 border border-blue-500 rounded-full mr-1"></span>
              <p className="text-xs text-gray-500">Disponible</p>
            </div>
            
            <p className="text-xs text-gray-500">
              {availableDates.length} días con noticias
            </p>
          </div>
        </>
      )}
    </div>
  );
}