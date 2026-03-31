const { calculateStatistics, calculateMedian, calculatePercentile } = require('./statistics');

describe('calculateStatistics', () => {
  test('returns undefined for empty array', () => {
    expect(calculateStatistics([])).toBeUndefined();
  });

  test('returns undefined for non-array input', () => {
    expect(calculateStatistics(null)).toBeUndefined();
    expect(calculateStatistics(undefined)).toBeUndefined();
    expect(calculateStatistics('hello')).toBeUndefined();
  });

  test('single element', () => {
    const result = calculateStatistics([5]);
    expect(result.median).toBe(5);
    expect(result.average).toBe(5);
    expect(result.outliers).toEqual([]);
  });

  test('two elements', () => {
    const result = calculateStatistics([2, 8]);
    expect(result.median).toBe(5);
    expect(result.average).toBe(5);
    expect(result.outliers).toEqual([]);
  });

  test('odd-length array: median is middle value', () => {
    const result = calculateStatistics([1, 3, 5, 7, 9]);
    expect(result.median).toBe(5);
  });

  test('even-length array: median is average of two middle values', () => {
    const result = calculateStatistics([1, 2, 3, 4]);
    expect(result.median).toBe(2.5);
  });

  test('average is calculated correctly', () => {
    const result = calculateStatistics([10, 20, 30]);
    expect(result.average).toBe(20);
  });

  test('decimal values (Fibonacci 0.5)', () => {
    const result = calculateStatistics([0, 0.5, 1, 2, 3]);
    expect(result.median).toBe(1);
    expect(result.average).toBeCloseTo(1.3);
  });

  test('all same values: no outliers', () => {
    const result = calculateStatistics([5, 5, 5, 5]);
    expect(result.median).toBe(5);
    expect(result.average).toBe(5);
    expect(result.outliers).toEqual([]);
  });

  test('detects outliers with IQR method', () => {
    const result = calculateStatistics([1, 2, 3, 4, 5, 100]);
    expect(result.outliers).toContain(100);
  });

  test('no outliers in tight distribution', () => {
    const result = calculateStatistics([1, 2, 3, 4, 5]);
    expect(result.outliers).toEqual([]);
  });

  test('negative numbers', () => {
    const result = calculateStatistics([-10, -5, 0, 5, 10]);
    expect(result.median).toBe(0);
    expect(result.average).toBe(0);
    expect(result.outliers).toEqual([]);
  });

  test('unsorted input is handled correctly', () => {
    const result = calculateStatistics([5, 1, 3, 2, 4]);
    expect(result.median).toBe(3);
    expect(result.average).toBe(3);
  });

  test('does not mutate the input array', () => {
    const input = [3, 1, 2];
    calculateStatistics(input);
    expect(input).toEqual([3, 1, 2]);
  });

  test('large dataset with clear outliers', () => {
    const data = [10, 11, 12, 13, 14, 15, 50];
    const result = calculateStatistics(data);
    expect(result.outliers).toContain(50);
  });

  test('Fibonacci card set produces valid stats', () => {
    const fibCards = [1, 2, 3, 5, 8];
    const result = calculateStatistics(fibCards);
    expect(result.median).toBe(3);
    expect(result.average).toBeCloseTo(3.8);
    expect(result.outliers).toEqual([]);
  });
});

describe('calculateMedian', () => {
  test('single element', () => {
    expect(calculateMedian([7])).toBe(7);
  });

  test('two elements', () => {
    expect(calculateMedian([1, 9])).toBe(5);
  });

  test('three elements', () => {
    expect(calculateMedian([1, 5, 9])).toBe(5);
  });

  test('four elements', () => {
    expect(calculateMedian([1, 2, 8, 9])).toBe(5);
  });
});

describe('calculatePercentile', () => {
  test('single element returns that element for any percentile', () => {
    expect(calculatePercentile([42], 0.25)).toBe(42);
    expect(calculatePercentile([42], 0.75)).toBe(42);
  });

  test('Q1 of [1, 2, 3, 4] with interpolation', () => {
    const q1 = calculatePercentile([1, 2, 3, 4], 0.25);
    expect(q1).toBe(1.75);
  });

  test('Q3 of [1, 2, 3, 4] with interpolation', () => {
    const q3 = calculatePercentile([1, 2, 3, 4], 0.75);
    expect(q3).toBe(3.25);
  });

  test('Q1 and Q3 of five elements', () => {
    const q1 = calculatePercentile([1, 2, 3, 4, 5], 0.25);
    const q3 = calculatePercentile([1, 2, 3, 4, 5], 0.75);
    expect(q1).toBe(2);
    expect(q3).toBe(4);
  });

  test('0th percentile returns first element', () => {
    expect(calculatePercentile([10, 20, 30], 0)).toBe(10);
  });

  test('100th percentile returns last element', () => {
    expect(calculatePercentile([10, 20, 30], 1)).toBe(30);
  });
});
