/**
 * Date Utilities Tests
 */

import { 
  formatDate, 
  formatDateLong, 
  formatDateShort, 
  getDateFromString,
  getDayName,
  getMonthName,
  getRelativeTimeFromNow
} from '../../utils/dateUtils';

describe('Date Utilities', () => {
  // Set a fixed date for testing
  const testDate = new Date('2023-05-15T12:00:00Z');
  
  beforeAll(() => {
    // Mock Date.now() to return a fixed timestamp
    jest.spyOn(Date, 'now').mockImplementation(() => new Date('2023-05-16T12:00:00Z').getTime());
  });
  
  afterAll(() => {
    // Restore the original implementation
    jest.restoreAllMocks();
  });

  describe('formatDate', () => {
    test('formats date correctly with default format', () => {
      const result = formatDate(testDate);
      expect(result).toBe('15/05/2023');
    });

    test('formats date string correctly', () => {
      const result = formatDate('2023-05-15');
      expect(result).toBe('15/05/2023');
    });

    test('returns empty string for invalid date', () => {
      const result = formatDate('invalid-date');
      expect(result).toBe('');
    });
  });

  describe('formatDateLong', () => {
    test('formats date in long format', () => {
      const result = formatDateLong(testDate);
      expect(result).toBe('15 de mayo de 2023');
    });

    test('formats date string in long format', () => {
      const result = formatDateLong('2023-05-15');
      expect(result).toBe('15 de mayo de 2023');
    });

    test('returns empty string for invalid date', () => {
      const result = formatDateLong('invalid-date');
      expect(result).toBe('');
    });
  });

  describe('formatDateShort', () => {
    test('formats date in short format', () => {
      const result = formatDateShort(testDate);
      expect(result).toBe('15 may');
    });

    test('formats date string in short format', () => {
      const result = formatDateShort('2023-05-15');
      expect(result).toBe('15 may');
    });

    test('returns empty string for invalid date', () => {
      const result = formatDateShort('invalid-date');
      expect(result).toBe('');
    });
  });

  describe('getDateFromString', () => {
    test('converts string to Date object', () => {
      const result = getDateFromString('2023-05-15');
      expect(result).toBeInstanceOf(Date);
      expect(result.getFullYear()).toBe(2023);
      expect(result.getMonth()).toBe(4); // May is month 4 (0-indexed)
      expect(result.getDate()).toBe(15);
    });

    test('returns null for invalid date string', () => {
      const result = getDateFromString('invalid-date');
      expect(result).toBeNull();
    });
  });

  describe('getDayName', () => {
    test('returns correct day name', () => {
      // May 15, 2023 was a Monday
      const result = getDayName(testDate);
      expect(result).toBe('lunes');
    });

    test('returns correct day name for date string', () => {
      const result = getDayName('2023-05-15');
      expect(result).toBe('lunes');
    });

    test('returns empty string for invalid date', () => {
      const result = getDayName('invalid-date');
      expect(result).toBe('');
    });
  });

  describe('getMonthName', () => {
    test('returns correct month name', () => {
      const result = getMonthName(testDate);
      expect(result).toBe('mayo');
    });

    test('returns correct month name for date string', () => {
      const result = getMonthName('2023-05-15');
      expect(result).toBe('mayo');
    });

    test('returns empty string for invalid date', () => {
      const result = getMonthName('invalid-date');
      expect(result).toBe('');
    });
  });

  describe('getRelativeTimeFromNow', () => {
    test('returns "hoy" for today', () => {
      const today = new Date('2023-05-16T10:00:00Z');
      const result = getRelativeTimeFromNow(today);
      expect(result).toBe('hoy');
    });

    test('returns "ayer" for yesterday', () => {
      const yesterday = new Date('2023-05-15T10:00:00Z');
      const result = getRelativeTimeFromNow(yesterday);
      expect(result).toBe('ayer');
    });

    test('returns "hace X días" for days in the past', () => {
      const twoDaysAgo = new Date('2023-05-14T10:00:00Z');
      const result = getRelativeTimeFromNow(twoDaysAgo);
      expect(result).toBe('hace 2 días');
    });

    test('returns formatted date for dates more than a week ago', () => {
      const twoWeeksAgo = new Date('2023-05-02T10:00:00Z');
      const result = getRelativeTimeFromNow(twoWeeksAgo);
      // This should return the formatted date
      expect(result).toBe('2 de mayo de 2023');
    });

    test('returns empty string for future dates', () => {
      const tomorrow = new Date('2023-05-17T10:00:00Z');
      const result = getRelativeTimeFromNow(tomorrow);
      expect(result).toBe('');
    });

    test('returns empty string for invalid date', () => {
      const result = getRelativeTimeFromNow('invalid-date');
      expect(result).toBe('');
    });
  });
});