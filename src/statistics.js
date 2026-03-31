/**
 * Calculate median, average, and outliers for a set of numeric values.
 * Outliers are detected using the 1.5 × IQR method.
 *
 * @param {number[]} numericCards - Array of numeric values
 * @returns {{ median: number, average: number, outliers: number[] } | undefined}
 */
function calculateStatistics(numericCards) {
  if (!Array.isArray(numericCards) || numericCards.length === 0) {
    return undefined;
  }

  const sortedCards = numericCards.slice().sort((a, b) => a - b);
  const len = sortedCards.length;

  const median = calculateMedian(sortedCards);
  const average = sortedCards.reduce((a, b) => a + b, 0) / len;

  const q1 = calculatePercentile(sortedCards, 0.25);
  const q3 = calculatePercentile(sortedCards, 0.75);
  const iqr = q3 - q1;
  const lowerBound = q1 - 1.5 * iqr;
  const upperBound = q3 + 1.5 * iqr;
  const outliers = sortedCards.filter(v => v < lowerBound || v > upperBound);

  return { median, average, outliers };
}

/**
 * Calculate the median of a sorted array.
 */
function calculateMedian(sorted) {
  const len = sorted.length;
  if (len % 2 === 0) {
    return (sorted[len / 2 - 1] + sorted[len / 2]) / 2;
  }
  return sorted[Math.floor(len / 2)];
}

/**
 * Calculate a percentile using linear interpolation (inclusive method).
 * @param {number[]} sorted - Sorted array of numbers
 * @param {number} p - Percentile as a fraction (e.g. 0.25 for Q1)
 */
function calculatePercentile(sorted, p) {
  const n = sorted.length;
  if (n === 1) return sorted[0];

  const index = p * (n - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const fraction = index - lower;

  if (lower === upper) return sorted[lower];
  return sorted[lower] + fraction * (sorted[upper] - sorted[lower]);
}

module.exports = { calculateStatistics, calculateMedian, calculatePercentile };
