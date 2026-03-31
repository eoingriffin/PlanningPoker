const fs = require('fs');
const path = require('path');

const DEFAULT_FLUSH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

class UsageStats {
  /**
   * @param {object} options
   * @param {string} [options.filePath] - Path to the JSON stats file
   * @param {number} [options.flushIntervalMs] - Auto-flush interval in ms (0 to disable)
   */
  constructor(options = {}) {
    this.filePath = options.filePath || path.join(process.cwd(), 'usage-stats.json');
    this.flushIntervalMs = options.flushIntervalMs !== undefined ? options.flushIntervalMs : DEFAULT_FLUSH_INTERVAL_MS;
    this.data = {};
    this.currentConnections = 0;
    this.deletedRoomIds = new Set();
    this._flushTimer = null;

    this._load();

    if (this.flushIntervalMs > 0) {
      this._flushTimer = setInterval(() => this.flush(), this.flushIntervalMs);
      if (this._flushTimer.unref) this._flushTimer.unref();
    }
  }

  /**
   * Get or create the stats bucket for the current month.
   */
  _getMonth(dateOverride) {
    const d = dateOverride || new Date();
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!this.data[key]) {
      this.data[key] = {
        totalConnections: 0,
        totalJoins: 0,
        uniqueRooms: [],
        roomReuses: 0,
        peakConcurrentUsers: 0,
        votingRounds: 0,
        cardSetUsage: {},
        usernameFrequency: {},
      };
    }
    return this.data[key];
  }

  recordConnection(dateOverride) {
    this.currentConnections++;
    const month = this._getMonth(dateOverride);
    month.totalConnections++;
    if (this.currentConnections > month.peakConcurrentUsers) {
      month.peakConcurrentUsers = this.currentConnections;
    }
  }

  recordDisconnect() {
    if (this.currentConnections > 0) {
      this.currentConnections--;
    }
  }

  recordJoin(roomId, username, dateOverride) {
    const month = this._getMonth(dateOverride);
    month.totalJoins++;

    if (!month.uniqueRooms.includes(roomId)) {
      month.uniqueRooms.push(roomId);
    }

    if (username) {
      month.usernameFrequency[username] = (month.usernameFrequency[username] || 0) + 1;
    }
  }

  recordRoomReuse(dateOverride) {
    const month = this._getMonth(dateOverride);
    month.roomReuses++;
  }

  /**
   * Track a room deletion so we can detect reuse later.
   */
  trackRoomDeletion(roomId) {
    this.deletedRoomIds.add(roomId);
  }

  /**
   * Check if a room is being reused (was previously deleted).
   * Returns true if reused, and removes it from the tracking set.
   */
  checkRoomReuse(roomId) {
    if (this.deletedRoomIds.has(roomId)) {
      this.deletedRoomIds.delete(roomId);
      return true;
    }
    return false;
  }

  recordVotingRound(dateOverride) {
    const month = this._getMonth(dateOverride);
    month.votingRounds++;
  }

  recordCardSetUsage(cardSetName, dateOverride) {
    if (!cardSetName) return;
    const month = this._getMonth(dateOverride);
    month.cardSetUsage[cardSetName] = (month.cardSetUsage[cardSetName] || 0) + 1;
  }

  /**
   * Load existing stats from disk.
   */
  _load() {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf8');
        this.data = JSON.parse(raw);
      }
    } catch (err) {
      console.error('UsageStats: Failed to load stats file, starting fresh:', err.message);
      this.data = {};
    }
  }

  /**
   * Flush current stats to disk.
   */
  flush() {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), 'utf8');
    } catch (err) {
      console.error('UsageStats: Failed to write stats file:', err.message);
    }
  }

  /**
   * Stop the auto-flush timer.
   */
  stop() {
    if (this._flushTimer) {
      clearInterval(this._flushTimer);
      this._flushTimer = null;
    }
  }

  /**
   * Get a summary for a given month key (e.g. "2026-03").
   */
  getSummary(monthKey) {
    const month = this.data[monthKey];
    if (!month) return undefined;
    return {
      ...month,
      uniqueRoomCount: month.uniqueRooms.length,
      averageRoomSize: month.uniqueRooms.length > 0
        ? +(month.totalJoins / month.uniqueRooms.length).toFixed(2)
        : 0,
    };
  }
}

module.exports = UsageStats;
