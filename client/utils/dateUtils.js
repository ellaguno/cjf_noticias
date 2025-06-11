import { format, parseISO, isValid, isToday, isYesterday, subDays } from 'date-fns/index.js';
import es from 'date-fns/locale/es/index.js';

/**
 * Format a date string to a human-readable format
 * @param {string} dateString - ISO date string
 * @param {string} formatStr - Format string for date-fns
 * @returns {string} Formatted date string
 */
export const formatDate = (dateString, formatStr = 'dd MMMM yyyy') => {
  if (!dateString) return '';
  
  const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;
  
  if (!isValid(date)) return 'Fecha inválida';
  
  return format(date, formatStr, { locale: es });
};

/**
 * Get a relative date string (today, yesterday, or formatted date)
 * @param {string} dateString - ISO date string
 * @returns {string} Relative date string
 */
export const getRelativeDate = (dateString) => {
  if (!dateString) return '';
  
  const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;
  
  if (!isValid(date)) return 'Fecha inválida';
  
  if (isToday(date)) {
    return 'Hoy';
  } else if (isYesterday(date)) {
    return 'Ayer';
  } else {
    return formatDate(date, 'dd MMM yyyy');
  }
};

/**
 * Format a date for URL paths
 * @param {Date|string} date - Date object or ISO string
 * @returns {string} Date formatted as YYYY-MM-DD
 */
export const formatDateForUrl = (date) => {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  
  if (!isValid(dateObj)) return '';
  
  return format(dateObj, 'yyyy-MM-dd');
};

/**
 * Get an array of the last n days
 * @param {number} days - Number of days to include
 * @returns {Array} Array of date objects
 */
export const getLastNDays = (days = 7) => {
  const result = [];
  const today = new Date();
  
  for (let i = 0; i < days; i++) {
    result.push(subDays(today, i));
  }
  
  return result;
};

/**
 * Check if a date is a weekend (Saturday or Sunday)
 * @param {Date|string} date - Date to check
 * @returns {boolean} True if weekend, false otherwise
 */
export const isWeekend = (date) => {
  if (!date) return false;
  
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  
  if (!isValid(dateObj)) return false;
  
  const day = dateObj.getDay();
  return day === 0 || day === 6; // 0 is Sunday, 6 is Saturday
};

export default {
  formatDate,
  getRelativeDate,
  formatDateForUrl,
  getLastNDays,
  isWeekend
};