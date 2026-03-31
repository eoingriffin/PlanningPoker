const fs = require('fs');
const path = require('path');
const UsageStats = require('./usageStats');

const TEST_FILE = path.join(__dirname, '__test_usage_stats.json');

function createStats(options = {}) {
  return new UsageStats({ filePath: TEST_FILE, flushIntervalMs: 0, ...options });
}

afterEach(() => {
  try { fs.unlinkSync(TEST_FILE); } catch (e) { /* ignore */ }
});

describe('UsageStats', () => {
  describe('recordConnection / recordDisconnect', () => {
    test('increments totalConnections', () => {
      const stats = createStats();
      stats.recordConnection();
      stats.recordConnection();
      const month = stats._getMonth();
      expect(month.totalConnections).toBe(2);
    });

    test('tracks peak concurrent users', () => {
      const stats = createStats();
      stats.recordConnection();
      stats.recordConnection();
      stats.recordConnection();
      stats.recordDisconnect();
      stats.recordConnection();
      const month = stats._getMonth();
      expect(month.peakConcurrentUsers).toBe(3);
    });

    test('disconnect does not go below zero', () => {
      const stats = createStats();
      stats.recordDisconnect();
      expect(stats.currentConnections).toBe(0);
    });
  });

  describe('recordJoin', () => {
    test('increments totalJoins', () => {
      const stats = createStats();
      stats.recordJoin('room1', 'Alice');
      stats.recordJoin('room1', 'Bob');
      const month = stats._getMonth();
      expect(month.totalJoins).toBe(2);
    });

    test('tracks unique rooms', () => {
      const stats = createStats();
      stats.recordJoin('room1', 'Alice');
      stats.recordJoin('room1', 'Bob');
      stats.recordJoin('room2', 'Charlie');
      const month = stats._getMonth();
      expect(month.uniqueRooms).toEqual(['room1', 'room2']);
    });

    test('tracks username frequency', () => {
      const stats = createStats();
      stats.recordJoin('room1', 'Alice');
      stats.recordJoin('room2', 'Alice');
      stats.recordJoin('room1', 'Bob');
      const month = stats._getMonth();
      expect(month.usernameFrequency).toEqual({ Alice: 2, Bob: 1 });
    });

    test('handles undefined username gracefully', () => {
      const stats = createStats();
      stats.recordJoin('room1', undefined);
      const month = stats._getMonth();
      expect(month.totalJoins).toBe(1);
      expect(month.usernameFrequency).toEqual({});
    });
  });

  describe('recordRoomReuse', () => {
    test('increments roomReuses counter', () => {
      const stats = createStats();
      stats.recordRoomReuse();
      stats.recordRoomReuse();
      const month = stats._getMonth();
      expect(month.roomReuses).toBe(2);
    });
  });

  describe('room deletion tracking', () => {
    test('trackRoomDeletion and checkRoomReuse detect reuse', () => {
      const stats = createStats();
      stats.trackRoomDeletion('room1');
      expect(stats.checkRoomReuse('room1')).toBe(true);
    });

    test('checkRoomReuse returns false for non-deleted room', () => {
      const stats = createStats();
      expect(stats.checkRoomReuse('room1')).toBe(false);
    });

    test('checkRoomReuse clears the tracking after first check', () => {
      const stats = createStats();
      stats.trackRoomDeletion('room1');
      stats.checkRoomReuse('room1');
      expect(stats.checkRoomReuse('room1')).toBe(false);
    });
  });

  describe('recordVotingRound', () => {
    test('increments votingRounds', () => {
      const stats = createStats();
      stats.recordVotingRound();
      stats.recordVotingRound();
      stats.recordVotingRound();
      const month = stats._getMonth();
      expect(month.votingRounds).toBe(3);
    });
  });

  describe('recordCardSetUsage', () => {
    test('tracks card set usage counts', () => {
      const stats = createStats();
      stats.recordCardSetUsage('Fibonacci');
      stats.recordCardSetUsage('Fibonacci');
      stats.recordCardSetUsage('T-shirt Sizes');
      const month = stats._getMonth();
      expect(month.cardSetUsage).toEqual({ Fibonacci: 2, 'T-shirt Sizes': 1 });
    });

    test('ignores falsy card set name', () => {
      const stats = createStats();
      stats.recordCardSetUsage(null);
      stats.recordCardSetUsage('');
      const month = stats._getMonth();
      expect(month.cardSetUsage).toEqual({});
    });
  });

  describe('monthly key isolation', () => {
    test('uses different buckets for different months', () => {
      const stats = createStats();
      const march = new Date(2026, 2, 15);
      const april = new Date(2026, 3, 10);
      stats.recordConnection(march);
      stats.recordConnection(april);
      stats.recordConnection(april);
      expect(stats.data['2026-03'].totalConnections).toBe(1);
      expect(stats.data['2026-04'].totalConnections).toBe(2);
    });

    test('month key is zero-padded', () => {
      const stats = createStats();
      const jan = new Date(2026, 0, 1);
      stats.recordConnection(jan);
      expect(stats.data['2026-01']).toBeDefined();
    });
  });

  describe('flush and load', () => {
    test('flush writes data to file and load restores it', () => {
      const stats1 = createStats();
      stats1.recordConnection();
      stats1.recordJoin('room1', 'Alice');
      stats1.recordVotingRound();
      stats1.flush();

      const stats2 = createStats();
      const month = stats2._getMonth();
      expect(month.totalConnections).toBe(1);
      expect(month.totalJoins).toBe(1);
      expect(month.votingRounds).toBe(1);
      expect(month.uniqueRooms).toEqual(['room1']);
      expect(month.usernameFrequency).toEqual({ Alice: 1 });
    });

    test('handles missing file gracefully on load', () => {
      const stats = createStats();
      expect(stats.data).toEqual({});
    });

    test('handles corrupt file gracefully on load', () => {
      fs.writeFileSync(TEST_FILE, 'not valid json!!!', 'utf8');
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
      const stats = createStats();
      expect(stats.data).toEqual({});
      expect(consoleError).toHaveBeenCalledWith(
        expect.stringContaining('Failed to load stats file'),
        expect.any(String)
      );
      consoleError.mockRestore();
    });
  });

  describe('getSummary', () => {
    test('returns summary with computed fields', () => {
      const stats = createStats();
      const date = new Date(2026, 2, 15);
      stats.recordConnection(date);
      stats.recordJoin('room1', 'Alice', date);
      stats.recordJoin('room1', 'Bob', date);
      stats.recordJoin('room2', 'Charlie', date);
      const summary = stats.getSummary('2026-03');
      expect(summary.uniqueRoomCount).toBe(2);
      expect(summary.averageRoomSize).toBe(1.5);
      expect(summary.totalJoins).toBe(3);
    });

    test('returns undefined for unknown month', () => {
      const stats = createStats();
      expect(stats.getSummary('2020-01')).toBeUndefined();
    });

    test('returns averageRoomSize 0 when no rooms', () => {
      const stats = createStats();
      stats.recordConnection();
      const key = stats._getMonth();
      // Manually get the key
      const monthKey = Object.keys(stats.data)[0];
      const summary = stats.getSummary(monthKey);
      expect(summary.averageRoomSize).toBe(0);
    });
  });

  describe('stop', () => {
    test('clears the flush timer', () => {
      const stats = new UsageStats({ filePath: TEST_FILE, flushIntervalMs: 60000 });
      expect(stats._flushTimer).not.toBeNull();
      stats.stop();
      expect(stats._flushTimer).toBeNull();
    });
  });
});
