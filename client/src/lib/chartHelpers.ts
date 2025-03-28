/**
 * Convert any time format to a number (Unix timestamp)
 */
export const getTimeAsNumber = (time: any): number => {
  if (typeof time === 'number') {
    return time;
  }

  if (typeof time === 'string') {
    // Try to parse as a number first (could be a string-encoded timestamp)
    const timestamp = parseInt(time, 10);
    if (!isNaN(timestamp)) {
      return timestamp;
    }

    // Try to parse as a date string
    const date = new Date(time);
    if (!isNaN(date.getTime())) {
      return Math.floor(date.getTime() / 1000); // Convert to Unix timestamp (seconds)
    }
  }

  // Default to current time if all else fails
  return Math.floor(Date.now() / 1000);
};

/**
 * Calculates EMA (Exponential Moving Average) for a dataset
 */
export const calculateEMA = (data: number[], period: number): number[] => {
  if (data.length < period) {
    return [];
  }

  // Calculate the multiplier for EMA
  const k = 2 / (period + 1);

  // Calculate SMA for the first period data points
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += data[i];
  }
  let ema = sum / period;

  // Calculate EMA for remaining data points
  const emaResults: number[] = [ema];
  for (let i = period; i < data.length; i++) {
    ema = (data[i] - ema) * k + ema;
    emaResults.push(ema);
  }

  // Pad the beginning with empty values to match the original data length
  const padding = Array(period - 1).fill(0);
  return [...padding, ...emaResults];
};