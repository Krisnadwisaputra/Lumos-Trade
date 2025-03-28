// Helper functions for chart handling

/**
 * Converts any time format to a number that can be used for comparison/sorting
 * Handles string dates, numeric timestamps, and BusinessDay objects
 */
export const getTimeAsNumber = (time: any): number => {
  if (typeof time === 'string') {
    return new Date(time).getTime();
  }
  if (typeof time === 'number') {
    return time;
  }
  if (time && typeof time === 'object' && 'year' in time) {
    // Handle BusinessDay object from lightweight-charts
    const { year, month, day } = time as { year: number, month: number, day: number };
    return new Date(year, month - 1, day).getTime();
  }
  return 0;
};

/**
 * Calculates EMA (Exponential Moving Average) for a dataset
 */
export const calculateEMA = (data: number[], period: number): number[] => {
  const k = 2 / (period + 1);
  let emaArray = [data[0]];
  
  for (let i = 1; i < data.length; i++) {
    emaArray.push(data[i] * k + emaArray[i - 1] * (1 - k));
  }
  
  return emaArray;
};